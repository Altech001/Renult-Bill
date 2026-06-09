import urllib.parse


def get_user_avatar(email: str) -> str:
    """Generate a beautiful adventurer avatar for a user using Dicebear."""
    safe_seed = urllib.parse.quote(email.strip().lower())
    return f"https://api.dicebear.com/7.x/adventurer/svg?seed={safe_seed}"


def get_branch_avatar(name: str) -> str:
    """Generate a clean identicon avatar for a branch using Dicebear."""
    safe_seed = urllib.parse.quote(name.strip())
    return f"https://api.dicebear.com/7.x/identicon/svg?seed={safe_seed}"


def get_staff_avatar(email: str) -> str:
    """Generate a charming lorelei avatar for staff members using Dicebear."""
    safe_seed = urllib.parse.quote(email.strip().lower())
    return f"https://api.dicebear.com/7.x/lorelei/svg?seed={safe_seed}"
