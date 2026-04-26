from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('questions', '0033_add_grading_attempt_status'),
    ]

    operations = [
        migrations.CreateModel(
            name='Substrand',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=150)),
                ('slug', models.SlugField(blank=True, max_length=150)),
                ('order', models.IntegerField(default=0)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('topic', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='substrands',
                    to='questions.topic',
                )),
            ],
            options={
                'db_table': 'substrands',
                'ordering': ['topic', 'order', 'name'],
                'unique_together': {('topic', 'name')},
            },
        ),
        migrations.AddField(
            model_name='question',
            name='substrand',
            field=models.ForeignKey(
                blank=True,
                help_text='Optional substrand grouping within the topic',
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='questions',
                to='questions.substrand',
            ),
        ),
    ]
