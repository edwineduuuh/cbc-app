from django.contrib import admin

from .models import Resource, ResourceAuditLog


@admin.register(Resource)
class ResourceAdmin(admin.ModelAdmin):
    list_display = ("title", "kind", "category", "grade", "access", "status", "extraction_eligible")
    list_filter = ("kind", "category", "access", "status", "extraction_eligible", "grade")
    search_fields = ("title", "description")


@admin.register(ResourceAuditLog)
class ResourceAuditLogAdmin(admin.ModelAdmin):
    list_display = ("resource_title", "action", "actor", "created_at")
    readonly_fields = [f.name for f in ResourceAuditLog._meta.fields]
