fn main() {
    println!("cargo:rerun-if-env-changed=STUDYHUB_GITHUB_REPO");
    tauri_build::build()
}
