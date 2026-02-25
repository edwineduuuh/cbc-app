from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, Classroom, ClassroomInvitation


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    """Custom admin interface for User model"""
    list_display = ['username', 'email', 'role', 'grade', 'is_staff', 'has_active_trial', 'date_joined']
    list_filter = ['role', 'is_staff', 'is_active', 'has_used_trial']
    search_fields = ['username', 'email', 'first_name', 'last_name']
    
    fieldsets = UserAdmin.fieldsets + (
        ('Role & Grade', {'fields': ('role', 'grade')}),
        ('Trial & Subscription', {'fields': ('trial_start', 'trial_end', 'has_used_trial')}),
    )
    
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Role & Grade', {'fields': ('role', 'grade')}),
    )
    
    def has_active_trial(self, obj):
        return obj.has_active_trial
    has_active_trial.boolean = True
    has_active_trial.short_description = 'Active Trial'


@admin.register(Classroom)
class ClassroomAdmin(admin.ModelAdmin):
    list_display = ['name', 'subject', 'grade', 'teacher', 'student_count', 'join_code', 'is_active']
    list_filter = ['grade', 'subject', 'is_active']
    search_fields = ['name', 'teacher__username', 'join_code']
    readonly_fields = ['join_code', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Basic Info', {'fields': ('name', 'grade', 'subject', 'teacher')}),
        ('Students', {'fields': ('students',)}),
        ('Settings', {'fields': ('description', 'is_active', 'join_code')}),
        ('Timestamps', {'fields': ('created_at', 'updated_at')}),
    )


@admin.register(ClassroomInvitation)
class ClassroomInvitationAdmin(admin.ModelAdmin):
    list_display = ['student', 'classroom', 'joined_at']
    list_filter = ['joined_at']
    search_fields = ['student__username', 'classroom__name']
    readonly_fields = ['joined_at']