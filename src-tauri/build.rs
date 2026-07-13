fn main() {
    ensure_development_icon();
    tauri_build::build()
}

fn ensure_development_icon() {
    let icon_path = std::path::Path::new("icons/icon.png");
    std::fs::create_dir_all("icons").expect("failed to create generated icon directory");
    let file = std::fs::File::create(icon_path).expect("failed to create generated icon");
    let mut encoder = png::Encoder::new(file, 32, 32);
    encoder.set_color(png::ColorType::Rgba);
    encoder.set_depth(png::BitDepth::Eight);
    let mut writer = encoder
        .write_header()
        .expect("failed to write generated icon header");
    let mut pixels = vec![0_u8; 32 * 32 * 4];
    for pixel in pixels.chunks_exact_mut(4) {
        pixel.copy_from_slice(&[170, 79, 50, 255]);
    }
    writer
        .write_image_data(&pixels)
        .expect("failed to write generated icon pixels");
}
