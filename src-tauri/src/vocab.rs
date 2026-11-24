use crate::models::{AddVocabInput, VocabEntry, VocabInboxItem, VocabReview};
use chrono::{Duration, Local, NaiveDate, Utc};
use std::collections::HashSet;
use uuid::Uuid;

pub const REVIEW_INTERVAL_STEPS: [i64; 4] = [1, 3, 7, 14];

pub fn normalize_word_key(word: &str) -> String {
    word.split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
        .to_lowercase()
}

pub fn normalize_subject(subject: Option<&str>) -> String {
    match subject.map(str::trim) {
        Some(s) if !s.is_empty() => s.to_string(),
        _ => "未分类".to_string(),
    }
}

pub fn format_today_ymd() -> String {
    Local::now().format("%Y-%m-%d").to_string()
}

pub fn add_days_to_ymd(ymd: &str, days: i64) -> String {
    if let Ok(date) = NaiveDate::parse_from_str(ymd, "%Y-%m-%d") {
        if let Some(next) = date.checked_add_signed(Duration::days(days)) {
            return next.format("%Y-%m-%d").to_string();
        }
    }
    (Local::now().date_naive() + Duration::days(days))
        .format("%Y-%m-%d")
        .to_string()
}

/// 记忆曲线：记得 1 -> 3 -> 7 -> 14（上限 14）；忘了重置为 1
pub fn calculate_next_review(
    current_interval_days: i64,
    remembered: bool,
    today_ymd: &str,
) -> VocabReview {
    if !remembered {
        return VocabReview {
            interval_days: 1,
            next_review: add_days_to_ymd(today_ymd, 1),
        };
    }

    let mut next_interval = 14;
    for step in REVIEW_INTERVAL_STEPS {
        if step > current_interval_days {
            next_interval = step;
            break;
        }
    }

    VocabReview {
        interval_days: next_interval,
        next_review: add_days_to_ymd(today_ymd, next_interval),
    }
}

pub fn add_or_increment_vocab(
    mut words: Vec<VocabEntry>,
    input: &AddVocabInput,
    today_ymd: &str,
    now_iso: &str,
) -> (Vec<VocabEntry>, VocabEntry, bool) {
    let key = normalize_word_key(&input.word);
    if let Some(idx) = words
        .iter()
        .position(|w| normalize_word_key(&w.word) == key)
    {
        let existing = &mut words[idx];
        existing.lookup_count += 1;
        if existing.meaning_zh.is_empty() {
            existing.meaning_zh = input.meaning_zh.trim().to_string();
        }
        if existing.phonetic.is_empty() {
            existing.phonetic = input.phonetic.as_deref().unwrap_or("").trim().to_string();
        }
        if existing.pos.is_empty() {
            existing.pos = input.pos.as_deref().unwrap_or("").trim().to_string();
        }
        let cloned = existing.clone();
        return (words, cloned, false);
    }

    let source = match input.source.as_deref().map(str::trim) {
        Some(s) if !s.is_empty() => s.to_string(),
        _ => "粘贴的文本".to_string(),
    };

    let new_entry = VocabEntry {
        id: Uuid::new_v4().to_string(),
        word: input.word.trim().to_string(),
        meaning_zh: input.meaning_zh.trim().to_string(),
        phonetic: input.phonetic.as_deref().unwrap_or("").trim().to_string(),
        pos: input.pos.as_deref().unwrap_or("").trim().to_string(),
        context: input.context.as_deref().unwrap_or("").trim().to_string(),
        source,
        subject: normalize_subject(input.subject.as_deref()),
        status: "learning".to_string(),
        added_at: now_iso.to_string(),
        learned_at: None,
        lookup_count: 1,
        review: VocabReview {
            next_review: add_days_to_ymd(today_ymd, 1),
            interval_days: 1,
        },
    };

    let mut next_words = Vec::with_capacity(words.len() + 1);
    next_words.push(new_entry.clone());
    next_words.extend(words);
    (next_words, new_entry, true)
}

pub fn merge_inbox_words(
    mut current: Vec<VocabEntry>,
    inbox_items: &[VocabInboxItem],
    today_ymd: &str,
    now_iso: &str,
) -> (Vec<VocabEntry>, usize) {
    let mut existing_keys: HashSet<String> = current
        .iter()
        .map(|w| normalize_word_key(&w.word))
        .collect();
    let mut added_count = 0usize;

    for item in inbox_items {
        let word_trimmed = item.word.trim();
        if word_trimmed.is_empty() {
            continue;
        }
        let key = normalize_word_key(word_trimmed);
        if existing_keys.contains(&key) {
            continue;
        }

        let input = AddVocabInput {
            word: word_trimmed.to_string(),
            meaning_zh: item.meaning_zh.clone().unwrap_or_default(),
            phonetic: item.phonetic.clone(),
            pos: item.pos.clone(),
            context: item.context.clone(),
            source: Some(item.source.clone().unwrap_or_else(|| "Agent".to_string())),
            subject: Some(
                item.subject
                    .clone()
                    .unwrap_or_else(|| "未分类".to_string()),
            ),
        };
        let (next_words, _, _) = add_or_increment_vocab(current, &input, today_ymd, now_iso);
        current = next_words;
        existing_keys.insert(key);
        added_count += 1;
    }

    (current, added_count)
}

pub fn mark_word_status(words: &mut [VocabEntry], id: &str, status: &str) {
    let now_iso = Utc::now().to_rfc3339();
    for w in words.iter_mut() {
        if w.id == id {
            w.status = status.to_string();
            w.learned_at = if status == "learned" {
                Some(now_iso.clone())
            } else {
                None
            };
        }
    }
}

pub fn export_vocab_to_markdown(words: &[VocabEntry]) -> String {
    let escape_cell = |val: &str| {
        val.replace('|', "\\|")
            .replace("\r\n", " ")
            .replace('\n', " ")
            .trim()
            .to_string()
    };

    let learning_count = words.iter().filter(|w| w.status == "learning").count();
    let learned_count = words.iter().filter(|w| w.status == "learned").count();

    let mut lines = vec![
        "# Joel Study Hub 单词库".to_string(),
        String::new(),
        format!(
            "> 共 {} 词 · 学习中 {} · 已学会 {}",
            words.len(),
            learning_count,
            learned_count
        ),
        String::new(),
        "| 单词 | 中文 | 原句 | 科目 | 状态 |".to_string(),
        "| --- | --- | --- | --- | --- |".to_string(),
    ];

    for w in words {
        let status_label = if w.status == "learned" {
            "已学会"
        } else {
            "学习中"
        };
        lines.push(format!(
            "| {} | {} | {} | {} | {} |",
            escape_cell(&w.word),
            escape_cell(&w.meaning_zh),
            escape_cell(&w.context),
            escape_cell(&w.subject),
            status_label
        ));
    }
    lines.push(String::new());
    lines.join("\n")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn review_intervals_follow_1_3_7_14_and_reset() {
        let r1 = calculate_next_review(1, true, "2026-05-01");
        assert_eq!(r1.interval_days, 3);
        assert_eq!(r1.next_review, "2026-05-04");

        let r2 = calculate_next_review(3, true, "2026-05-04");
        assert_eq!(r2.interval_days, 7);

        let r3 = calculate_next_review(7, true, "2026-05-11");
        assert_eq!(r3.interval_days, 14);

        let r4 = calculate_next_review(14, true, "2026-05-25");
        assert_eq!(r4.interval_days, 14);

        let forgot = calculate_next_review(14, false, "2026-05-25");
        assert_eq!(forgot.interval_days, 1);
        assert_eq!(forgot.next_review, "2026-05-26");
    }

    #[test]
    fn add_and_merge_deduplicate_case_insensitively() {
        let input = AddVocabInput {
            word: "Latency".to_string(),
            meaning_zh: "延迟".to_string(),
            phonetic: None,
            pos: None,
            context: None,
            source: None,
            subject: Some("ICT".to_string()),
        };
        let (words, entry, is_new) =
            add_or_increment_vocab(vec![], &input, "2026-05-01", "2026-05-01T00:00:00Z");
        assert!(is_new);
        assert_eq!(entry.lookup_count, 1);

        let (words2, entry2, is_new2) =
            add_or_increment_vocab(words, &input, "2026-05-01", "2026-05-01T00:00:00Z");
        assert!(!is_new2);
        assert_eq!(words2.len(), 1);
        assert_eq!(entry2.lookup_count, 2);

        let inbox = vec![
            VocabInboxItem {
                word: "latency".to_string(),
                meaning_zh: Some("不应覆盖".to_string()),
                phonetic: None,
                pos: None,
                context: None,
                source: None,
                subject: None,
            },
            VocabInboxItem {
                word: "throughput".to_string(),
                meaning_zh: Some("吞吐量".to_string()),
                phonetic: None,
                pos: None,
                context: None,
                source: None,
                subject: Some("ICT".to_string()),
            },
        ];
        let (merged, added) = merge_inbox_words(words2, &inbox, "2026-05-01", "2026-05-01T00:00:00Z");
        assert_eq!(added, 1);
        assert_eq!(merged.len(), 2);
    }
}
