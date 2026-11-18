from django.urls import path

from . import review_views, views

urlpatterns = [
    path("library/", views.student_library, name="library-list"),
    path("library/<int:pk>/open/", views.student_open, name="library-open"),
    path("facilitator/revision-notes/", views.facilitator_notes, name="facilitator-notes"),
    path("facilitator/revision-notes/<int:pk>/open/", views.facilitator_note_open,
         name="facilitator-note-open"),
    path("admin/library/", views.admin_list, name="admin-library"),
    path("admin/library/meta/", views.admin_meta, name="admin-library-meta"),
    path("admin/library/<int:pk>/", views.admin_detail, name="admin-library-detail"),
    path("admin/library/<int:pk>/publish/", views.admin_publish, name="admin-library-publish"),
    path("admin/library/<int:pk>/archive/", views.admin_archive, name="admin-library-archive"),
    path("admin/library/<int:pk>/analyse/", review_views.admin_analyse, name="admin-library-analyse"),
    path("admin/library/<int:pk>/extraction/", review_views.admin_extraction,
         name="admin-library-extraction"),
    path("admin/library/<int:pk>/extraction/approve-confident/", review_views.admin_approve_confident,
         name="admin-library-approve-confident"),
    path("admin/library/questions/<int:qid>/review/", review_views.admin_review_question,
         name="admin-library-review-question"),
]
