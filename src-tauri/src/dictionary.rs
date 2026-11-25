use crate::models::{EcdictRecord, LookupOptionsInput, LookupResult};
use std::collections::HashMap;

const BUILTIN_SEED_JSON: &str = include_str!("../data/ecdict_seed.json");

pub struct DictionaryIndex {
    pub by_word: HashMap<String, EcdictRecord>,
    pub inflection_to_lemma: HashMap<String, String>,
}

fn lookup_uppercase_acronym(token: &str) -> Option<(&'static str, &'static str, &'static str)> {
    match token {
        "IS" => Some(("IS", "abbr.", "信息系统 (Information System)")),
        "IT" => Some(("IT", "abbr.", "信息技术 (Information Technology)")),
        "ICT" => Some((
            "ICT",
            "abbr.",
            "信息与通信技术 (Information & Communications Technology)",
        )),
        "MIS" => Some(("MIS", "abbr.", "管理信息系统 (Management Information System)")),
        "ERP" => Some(("ERP", "abbr.", "企业资源计划 (Enterprise Resource Planning)")),
        "CRM" => Some((
            "CRM",
            "abbr.",
            "客户关系管理 (Customer Relationship Management)",
        )),
        "SCM" => Some(("SCM", "abbr.", "供应链管理 (Supply Chain Management)")),
        "TPS" => Some((
            "TPS",
            "abbr.",
            "事务处理系统 (Transaction Processing System)",
        )),
        "DSS" => Some(("DSS", "abbr.", "决策支持系统 (Decision Support System)")),
        "ESS" => Some(("ESS", "abbr.", "高管支持系统 (Executive Support System)")),
        "BI" => Some(("BI", "abbr.", "商业智能 (Business Intelligence)")),
        "AI" => Some(("AI", "abbr.", "人工智能 (Artificial Intelligence)")),
        "API" => Some((
            "API",
            "abbr.",
            "应用程序接口 (Application Programming Interface)",
        )),
        "SQL" => Some(("SQL", "abbr.", "结构化查询语言 (Structured Query Language)")),
        "SLA" => Some(("SLA", "abbr.", "服务级别协议 (Service Level Agreement)")),
        "KPI" => Some(("KPI", "abbr.", "关键绩效指标 (Key Performance Indicator)")),
        "ROI" => Some(("ROI", "abbr.", "投资回报率 (Return on Investment)")),
        "B2B" => Some(("B2B", "abbr.", "企业对企业 (Business-to-Business)")),
        "B2C" => Some(("B2C", "abbr.", "企业对消费者 (Business-to-Consumer)")),
        "GDP" => Some(("GDP", "abbr.", "国内生产总值 (Gross Domestic Product)")),
        "CPI" => Some(("CPI", "abbr.", "消费者物价指数 (Consumer Price Index)")),
        "PED" => Some((
            "PED",
            "abbr.",
            "需求价格弹性 (Price Elasticity of Demand)",
        )),
        "SWOT" => Some(("SWOT", "abbr.", "优势/劣势/机会/威胁分析")),
        "SaaS" => Some(("SaaS", "abbr.", "软件即服务 (Software as a Service)")),
        "PaaS" => Some(("PaaS", "abbr.", "平台即服务 (Platform as a Service)")),
        "IaaS" => Some((
            "IaaS",
            "abbr.",
            "基础设施即服务 (Infrastructure as a Service)",
        )),
        _ => None,
    }
}

/// 去掉单词前后的标点和所有格（与 TypeScript cleanToken 100% 行为一致）
pub fn clean_token(raw: &str) -> String {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return String::new();
    }

    let s = trimmed
        .trim_start_matches(|c: char| !c.is_ascii_alphanumeric())
        .trim_end_matches(|c: char| !c.is_ascii_alphanumeric() && c != '\'' && c != '\u{2019}');

    // 去掉所有格 's 或 ’s（大小写不敏感）
    let s = if let Some(prefix) = s
        .strip_suffix("'s")
        .or_else(|| s.strip_suffix("'S"))
        .or_else(|| s.strip_suffix("\u{2019}s"))
        .or_else(|| s.strip_suffix("\u{2019}S"))
    {
        prefix
    } else {
        s
    };

    // 去掉复数所有格末尾撇号 competitors' -> competitors
    let s = s.trim_end_matches(|c: char| c == '\'' || c == '\u{2019}');

    // 再清理一次首尾残留非字母数字字符
    s.trim_matches(|c: char| !c.is_ascii_alphanumeric())
        .to_string()
}

/// 将 ECDICT 多行中文释义拆分为去重后的独立义项列表
pub fn split_meaning_senses(raw_translation: &str) -> Vec<String> {
    if raw_translation.is_empty() {
        return Vec::new();
    }

    let normalized = raw_translation.replace("\\n", "\n");
    let mut cleaned_lines: Vec<String> = Vec::new();

    for line in normalized.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }
        // 去掉行首词性前缀如 "n. " / "vt. " / "adj. "
        let stripped = strip_leading_pos(trimmed);
        if !stripped.is_empty() {
            cleaned_lines.push(stripped.to_string());
        }
    }

    let joined = cleaned_lines.join("；");
    let mut unique: Vec<String> = Vec::new();
    for part in joined.split(|c: char| c == '；' || c == ';' || c == '，' || c == ',') {
        let p = part.trim();
        if p.is_empty() {
            continue;
        }
        if !unique.iter().any(|existing| existing == p) {
            unique.push(p.to_string());
        }
    }
    unique
}

/// 将 ECDICT 多行中文释义精简为最多 max_senses 个简短义项
pub fn condense_meaning_zh(raw_translation: &str, max_senses: usize) -> String {
    split_meaning_senses(raw_translation)
        .into_iter()
        .take(max_senses)
        .collect::<Vec<_>>()
        .join("；")
}

fn strip_leading_pos(line: &str) -> &str {
    let bytes = line.as_bytes();
    let mut i = 0;
    while i < bytes.len() && bytes[i].is_ascii_alphabetic() {
        i += 1;
    }
    if i > 0 && i < bytes.len() && bytes[i] == b'.' {
        line[i + 1..].trim()
    } else {
        line
    }
}

pub fn load_builtin_records() -> Vec<EcdictRecord> {
    serde_json::from_str::<Vec<EcdictRecord>>(BUILTIN_SEED_JSON).unwrap_or_default()
}

pub fn build_dictionary_index(records: Vec<EcdictRecord>) -> DictionaryIndex {
    let mut by_word: HashMap<String, EcdictRecord> = HashMap::with_capacity(records.len());
    let mut inflection_to_lemma: HashMap<String, String> = HashMap::new();

    for rec in records {
        let lower = rec.word.trim().to_lowercase();
        if lower.is_empty() {
            continue;
        }
        let exchange = rec.exchange.clone();
        by_word.entry(lower.clone()).or_insert(rec);

        if !exchange.is_empty() {
            for pair in exchange.split('/') {
                if let Some((tag, raw_val)) = pair.split_once(':') {
                    let tag = tag.trim();
                    let val = raw_val.trim().to_lowercase();
                    if val.is_empty() {
                        continue;
                    }
                    if tag == "0" {
                        inflection_to_lemma.entry(lower.clone()).or_insert(val);
                    } else if matches!(tag, "p" | "d" | "i" | "3" | "s" | "r" | "t") {
                        inflection_to_lemma.entry(val).or_insert_with(|| lower.clone());
                    }
                }
            }
        }
    }

    DictionaryIndex {
        by_word,
        inflection_to_lemma,
    }
}

fn rule_based_lemma_candidates(lower: &str) -> Vec<String> {
    let mut candidates = Vec::new();
    if lower.ends_with("ies") && lower.len() > 4 {
        candidates.push(format!("{}y", &lower[..lower.len() - 3]));
    }
    if lower.ends_with("es") && lower.len() > 3 {
        candidates.push(lower[..lower.len() - 2].to_string());
        candidates.push(lower[..lower.len() - 1].to_string());
    }
    if lower.ends_with('s') && !lower.ends_with("ss") && lower.len() > 2 {
        candidates.push(lower[..lower.len() - 1].to_string());
    }
    if lower.ends_with("ied") && lower.len() > 4 {
        candidates.push(format!("{}y", &lower[..lower.len() - 3]));
    }
    if lower.ends_with("ed") && lower.len() > 3 {
        let stem = &lower[..lower.len() - 2];
        candidates.push(stem.to_string());
        candidates.push(lower[..lower.len() - 1].to_string());
        let stem_bytes = stem.as_bytes();
        if stem_bytes.len() >= 2 && stem_bytes[stem_bytes.len() - 1] == stem_bytes[stem_bytes.len() - 2] {
            candidates.push(stem[..stem.len() - 1].to_string());
        }
    }
    if lower.ends_with("ing") && lower.len() > 4 {
        let stem = &lower[..lower.len() - 3];
        candidates.push(stem.to_string());
        candidates.push(format!("{}e", stem));
        let stem_bytes = stem.as_bytes();
        if stem_bytes.len() >= 2 && stem_bytes[stem_bytes.len() - 1] == stem_bytes[stem_bytes.len() - 2] {
            candidates.push(stem[..stem.len() - 1].to_string());
        }
    }
    candidates
}

fn find_ecdict_record<'a>(
    cleaned_surface: &str,
    index: &'a DictionaryIndex,
) -> Option<(&'a EcdictRecord, Option<String>)> {
    let lower = cleaned_surface.to_lowercase();
    if lower.is_empty() {
        return None;
    }

    if let Some(mapped_lemma) = index.inflection_to_lemma.get(&lower) {
        if mapped_lemma != &lower {
            if let Some(lemma_rec) = index.by_word.get(mapped_lemma) {
                return Some((lemma_rec, Some(format!("{} → {}", cleaned_surface, lemma_rec.word))));
            }
        }
    }

    if let Some(direct_rec) = index.by_word.get(&lower) {
        return Some((direct_rec, None));
    }

    for cand in rule_based_lemma_candidates(&lower) {
        if let Some(cand_rec) = index.by_word.get(&cand) {
            return Some((cand_rec, Some(format!("{} → {}", cleaned_surface, cand_rec.word))));
        }
    }

    None
}

fn build_glossary_result(
    matched_key: &str,
    raw_trimmed: &str,
    cleaned_surface: &str,
    glossary_meaning: &str,
    index: &DictionaryIndex,
) -> LookupResult {
    let lookup_token = if cleaned_surface.is_empty() {
        matched_key.trim()
    } else {
        cleaned_surface
    };
    let ecdict_hit = if !lookup_token.contains(' ') {
        find_ecdict_record(lookup_token, index)
    } else {
        None
    };

    let primary_parts = split_meaning_senses(glossary_meaning);
    let glossary_trimmed = glossary_meaning.trim();
    let alternatives = if let Some((rec, _)) = ecdict_hit {
        split_meaning_senses(&rec.translation)
            .into_iter()
            .filter(|s| s != glossary_trimmed && !primary_parts.iter().any(|p| p == s))
            .take(5)
            .collect()
    } else {
        Vec::new()
    };

    LookupResult {
        word: matched_key.to_string(),
        surface: raw_trimmed.to_string(),
        phonetic: ecdict_hit.map(|(r, _)| r.phonetic.clone()).unwrap_or_default(),
        pos: "术语".to_string(),
        meaning_zh: glossary_meaning.to_string(),
        alternatives,
        source: "glossary".to_string(),
        found: true,
        ..Default::default()
    }
}

fn build_ecdict_result(
    rec: &EcdictRecord,
    cleaned_surface: &str,
    lemma_note: Option<String>,
) -> LookupResult {
    let all_senses = split_meaning_senses(&rec.translation);
    let meaning_zh = all_senses.iter().take(3).cloned().collect::<Vec<_>>().join("；");
    let alternatives = all_senses.into_iter().skip(3).take(4).collect();
    LookupResult {
        word: rec.word.clone(),
        surface: cleaned_surface.to_string(),
        phonetic: rec.phonetic.clone(),
        pos: rec.pos.clone(),
        meaning_zh,
        alternatives,
        source: "ecdict".to_string(),
        lemma_note,
        found: true,
        ..Default::default()
    }
}

/// 严格按 4 级优先级执行点词查义（与 TypeScript lookupWord 100% 行为一致）
pub fn lookup_word(
    raw_surface: &str,
    options: &LookupOptionsInput,
    index: &DictionaryIndex,
) -> LookupResult {
    let cleaned_surface = clean_token(raw_surface);
    let raw_trimmed = raw_surface.trim();

    // 1. 优先匹配当前测验 glossary（整组最长匹配优先，并从离线词典补充音标与其他说法）
    if let Some(glossary) = &options.glossary {
        if let Some(matched_key) = &options.matched_glossary_key {
            if let Some(val) = glossary.get(matched_key) {
                return build_glossary_result(matched_key, raw_trimmed, &cleaned_surface, val, index);
            }
        }

        let target_lower = cleaned_surface.to_lowercase();
        let raw_lower = raw_trimmed.to_lowercase();
        let mut keys: Vec<&String> = glossary.keys().collect();
        keys.sort_by(|a, b| b.len().cmp(&a.len()));
        for key in keys {
            let key_lower = key.trim().to_lowercase();
            if key_lower == target_lower || key_lower == raw_lower {
                if let Some(val) = glossary.get(key) {
                    return build_glossary_result(key, raw_trimmed, &cleaned_surface, val, index);
                }
            }
        }
    }

    // 2. 大写专业缩写特殊处理（区分大小写）
    if !cleaned_surface.is_empty() {
        if let Some((word, pos, meaning)) = lookup_uppercase_acronym(&cleaned_surface) {
            return LookupResult {
                word: word.to_string(),
                surface: cleaned_surface,
                pos: pos.to_string(),
                meaning_zh: meaning.to_string(),
                source: "acronym".to_string(),
                found: true,
                ..Default::default()
            };
        }
    }

    // 3. 离线词典 ECDICT + exchange 词形还原
    if !cleaned_surface.is_empty() {
        if let Some((rec, lemma_note)) = find_ecdict_record(&cleaned_surface, index) {
            return build_ecdict_result(rec, &cleaned_surface, lemma_note);
        }
    }

    // 4. 未命中
    let fallback_word = if cleaned_surface.is_empty() {
        raw_trimmed.to_string()
    } else {
        cleaned_surface
    };
    LookupResult {
        word: fallback_word.clone(),
        surface: fallback_word,
        source: "not_found".to_string(),
        found: false,
        ..Default::default()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn clean_token_matches_ts_behavior() {
        assert_eq!(clean_token("competitors'"), "competitors");
        assert_eq!(clean_token("company’s"), "company");
        assert_eq!(clean_token("\"hybrid,\""), "hybrid");
        assert_eq!(clean_token("(suppliers)"), "suppliers");
    }

    #[test]
    fn lookup_prioritizes_glossary_then_acronym_then_ecdict() {
        let index = build_dictionary_index(load_builtin_records());
        let mut glossary = HashMap::new();
        glossary.insert("supply chain".to_string(), "供应链".to_string());

        let g = lookup_word(
            "supply chain",
            &LookupOptionsInput {
                glossary: Some(glossary),
                matched_glossary_key: Some("supply chain".to_string()),
            },
            &index,
        );
        assert_eq!(g.source, "glossary");
        assert_eq!(g.meaning_zh, "供应链");

        let is_upper = lookup_word("IS", &LookupOptionsInput::default(), &index);
        assert_eq!(is_upper.source, "acronym");

        let is_lower = lookup_word("is", &LookupOptionsInput::default(), &index);
        assert_ne!(is_lower.source, "acronym");
    }

    #[test]
    fn condense_limits_to_three_senses() {
        let condensed = condense_meaning_zh("n. 计划；方案；设计\\nv. 打算；规划", 3);
        assert_eq!(condensed, "计划；方案；设计");
    }

    #[test]
    fn glossary_match_keeps_ecdict_alternatives_and_phonetic() {
        let index = build_dictionary_index(load_builtin_records());
        let mut glossary = HashMap::new();
        glossary.insert("stakeholder".to_string(), "利益相关者".to_string());

        let res = lookup_word(
            "stakeholder",
            &LookupOptionsInput {
                glossary: Some(glossary),
                matched_glossary_key: Some("stakeholder".to_string()),
            },
            &index,
        );
        assert_eq!(res.source, "glossary");
        assert_eq!(res.meaning_zh, "利益相关者");
        assert!(!res.phonetic.is_empty());
        assert!(res.alternatives.iter().any(|s| s == "股东"));
    }
}
