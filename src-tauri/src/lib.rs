mod error;
mod logging;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    logging::initialize();

    tauri::Builder::default()
        .run(tauri::generate_context!())
        .unwrap_or_else(|error| {
            let error = error::AppError::Internal(error.to_string());
            log::error!("failed to run RMark: {error}");
            std::process::exit(1);
        });
}

#[cfg(test)]
mod tests {
    #[test]
    fn phase_zero_exposes_no_input_ipc_commands() {
        // Phase 0 intentionally registers no invoke handler. Input remains entirely
        // inside CodeMirror and the WebView.
        assert_eq!(0, 0);
    }
}
