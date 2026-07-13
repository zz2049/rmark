use std::fmt::{Display, Formatter};

#[derive(Debug)]
pub enum AppError {
    Internal(String),
}

impl Display for AppError {
    fn fmt(&self, formatter: &mut Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Internal(message) => write!(formatter, "internal error: {message}"),
        }
    }
}

impl std::error::Error for AppError {}

#[cfg(test)]
mod tests {
    use super::AppError;

    #[test]
    fn error_messages_have_stable_context() {
        assert_eq!(
            AppError::Internal("test".into()).to_string(),
            "internal error: test"
        );
    }
}
