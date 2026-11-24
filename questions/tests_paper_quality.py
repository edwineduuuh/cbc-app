"""Teacher instructions win; figures are exact; tables are tables."""
from django.test import SimpleTestCase

from questions.assessments import _lift_table, _unmark, figure_quota
from questions.plots import render_plot


class PaperQuality(SimpleTestCase):
    def test_teacher_figure_count_wins(self):
        self.assertEqual(figure_quota("Make at least 2 to 3 diagrams.", True, 10), 3)
        self.assertEqual(figure_quota("include two graphs", False, 10), 2)
        self.assertEqual(figure_quota("", True, 12), 3)
        self.assertEqual(figure_quota("", False, 10), 0)

    def test_geometry_is_drawn_with_labels(self):
        svg, alt = render_plot({"type": "geometry", "points": {"A": [0, 0], "B": [12, 0], "C": [12, 5]},
                                "segments": [["A", "B"], ["B", "C"], ["C", "A"]],
                                "side_labels": [{"side": ["A", "B"], "text": "12 m"}],
                                "right_angles": [{"at": "B", "between": ["A", "C"]}]})
        self.assertIn(b"12 m", svg)
        self.assertIn("right angle at B", alt)

    def test_graph_axes_are_named(self):
        svg, _ = render_plot({"type": "cartesian", "x_range": [0, 6], "y_range": [0, 60], "x_step": 1,
                              "y_step": 10, "x_label": "Time (hours)", "y_label": "Distance (km)"})
        self.assertIn(b"Time (hours)", svg)
        self.assertIn(b"Distance (km)", svg)

    def test_pipe_rows_become_a_table_and_markdown_goes(self):
        q = {"question_text": "The table shows cloth used.\nItem | Cloth used\nShirt | 2 m\nDress | 3 m\nFind the total.",
             "options": {"A": "**5 m**"}}
        _lift_table(q)
        _unmark(q)
        self.assertEqual(q["table"], {"headers": ["Item", "Cloth used"], "rows": [["Shirt", "2 m"], ["Dress", "3 m"]]})
        self.assertNotIn("|", q["question_text"])
        self.assertEqual(q["options"]["A"], "5 m")
