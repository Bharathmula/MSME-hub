"""Platform-owner control plane installation."""

from .routes import platform_owner


def install(app) -> None:
    app.register_blueprint(platform_owner)
