use log::LevelFilter;

pub fn initialize() {
    let level = if cfg!(debug_assertions) {
        LevelFilter::Debug
    } else {
        LevelFilter::Warn
    };

    let mut builder = env_logger::Builder::new();
    builder.filter_level(level).format_timestamp_millis();
    let _ = builder.try_init();

    std::panic::set_hook(Box::new(|panic_info| {
        log::error!("unhandled Rust panic: {panic_info}");
    }));
}
