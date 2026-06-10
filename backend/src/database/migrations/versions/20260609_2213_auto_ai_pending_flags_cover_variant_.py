"""auto_ai pending flags + cover_variant + pending_files

Revision ID: 783f2d250106
Revises: 8b980d0cd92e
Create Date: 2026-06-09 22:13:26.227889

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '783f2d250106'
down_revision = '8b980d0cd92e'
branch_labels = None
depends_on = None


# Reuse the existing digital_variant enum without re-creating the Postgres type.
digital_variant_enum = sa.Enum('enhanced', 'restyled', name='digital_variant', create_type=False)


def upgrade() -> None:
    # `pending_section` is a brand-new type; let create_table auto-create it
    # via the column definition. Reusing a module-level Enum with
    # create_type=False here would suppress the auto-create entirely.
    op.create_table(
        'pending_files',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('author_id', sa.Integer(), nullable=False),
        sa.Column('section', sa.Enum('book', 'comic', name='pending_section'), nullable=False),
        sa.Column('disk_path', sa.String(length=1024), nullable=False),
        sa.Column('original_filename', sa.String(length=512), nullable=False),
        sa.Column('thumbnail_url', sa.String(length=512), nullable=False),
        sa.Column('scanned_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['author_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_pending_files_author_id'), 'pending_files', ['author_id'], unique=False)

    # Booleans default to false so existing rows backfill cleanly.
    op.add_column('pages', sa.Column('enhance_pending', sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column('pages', sa.Column('transcribe_pending', sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column('works', sa.Column('cover_variant', digital_variant_enum, nullable=True))
    op.add_column('works', sa.Column('cover_enhance_pending', sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column('works', sa.Column('cover_restyle_pending', sa.Boolean(), nullable=False, server_default=sa.false()))


def downgrade() -> None:
    op.drop_column('works', 'cover_restyle_pending')
    op.drop_column('works', 'cover_enhance_pending')
    op.drop_column('works', 'cover_variant')
    op.drop_column('pages', 'transcribe_pending')
    op.drop_column('pages', 'enhance_pending')
    op.drop_index(op.f('ix_pending_files_author_id'), table_name='pending_files')
    op.drop_table('pending_files')
    pending_section_enum.drop(op.get_bind(), checkfirst=True)
