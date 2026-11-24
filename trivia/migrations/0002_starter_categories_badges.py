"""The starting categories and badges. Admins can rename, reorder, switch
off or add to all of them. No questions are created here."""
from django.db import migrations

CATEGORIES = [
    # name, slug, emoji, colour, group, description
    ("General Knowledge", "general-knowledge", "🌍", "#20B8A6", "learn", "World facts, inventions, records and discoveries."),
    ("Science", "science", "🔬", "#4D8DDA", "learn", "Biology, chemistry, physics, space and the human body."),
    ("Mathematics", "mathematics", "🔢", "#E8B65B", "learn", "Mental maths, number puzzles, patterns and logic."),
    ("Geography", "geography", "🗺️", "#3CCB8B", "learn", "Countries, capitals, flags, landmarks and landforms."),
    ("History", "history", "🏛️", "#C08457", "learn", "Ancient civilisations, African and world history."),
    ("Technology", "technology", "💻", "#7C8CF8", "learn", "Computers, the internet, coding and AI."),
    ("Sports", "sports", "⚽", "#F07178", "fun", "Football, athletics, basketball and the Olympics."),
    ("Animals & Nature", "animals-nature", "🦁", "#8BC34A", "fun", "Wildlife, habitats, plants and ecosystems."),
    ("Language", "language", "📝", "#B48EF5", "learn", "Words, meanings, spelling and grammar."),
    ("Entertainment", "entertainment", "🎬", "#FF9F5A", "fun", "Films, animation, books and music."),
    ("Riddles & Logic", "riddles-logic", "🧩", "#5ED3F3", "fun", "Brain teasers, patterns and lateral thinking."),
]

BADGES = [
    # code, name, description, icon, condition, threshold, mode, category slug, xp
    ("first-game", "First Game", "Finish your first game.", "🎮", "games", 1, "", "", 20),
    ("perfect-round", "Perfect Round", "Get every question right in a game of 5 or more.", "💯", "perfect", 5, "", "", 100),
    ("speed-thinker", "Speed Thinker", "5 correct answers in one game, each in under 5 seconds.", "⚡", "fast", 5, "", "", 75),
    ("science-explorer", "Science Explorer", "Answer 25 science questions correctly.", "🔬", "category", 25, "", "science", 75),
    ("geography-master", "Geography Master", "Answer 50 geography questions correctly.", "🗺️", "category", 50, "", "geography", 100),
    ("math-whiz", "Math Whiz", "Answer 25 mathematics questions correctly.", "🔢", "category", 25, "", "mathematics", 75),
    ("picture-detective", "Picture Detective", "Finish 3 Picture Trivia games.", "🔍", "mode", 3, "picture", "", 60),
    ("daily-challenger", "Daily Challenger", "Complete a Daily Challenge.", "📅", "daily", 1, "", "", 30),
    ("survival-expert", "Survival Expert", "Reach 15 correct in one Survival run.", "🔥", "survival", 15, "", "", 120),
    ("on-a-roll", "On a Roll", "Get 10 right in a row.", "🎯", "streak", 10, "", "", 80),
    ("knowledge-collector", "Knowledge Collector", "Unlock 5 other badges.", "🏆", "collector", 5, "", "", 150),
]


def seed(apps, schema_editor):
    Cat = apps.get_model("trivia", "TriviaCategory")
    Ach = apps.get_model("trivia", "TriviaAchievement")
    by_slug = {}
    for i, (name, slug, icon, color, group, desc) in enumerate(CATEGORIES):
        c, _ = Cat.objects.get_or_create(slug=slug, defaults=dict(
            name=name, icon=icon, color=color, group=group, description=desc, order=i))
        by_slug[slug] = c
    for i, (code, name, desc, icon, cond, n, mode, cat, xp) in enumerate(BADGES):
        Ach.objects.get_or_create(code=code, defaults=dict(
            name=name, description=desc, icon=icon, condition=cond, threshold=n, mode=mode,
            category=by_slug.get(cat), xp_reward=xp, order=i))


class Migration(migrations.Migration):
    dependencies = [("trivia", "0001_initial")]
    operations = [migrations.RunPython(seed, migrations.RunPython.noop)]
