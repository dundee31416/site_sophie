"""add page text + enhanced/restyled paths + work digital_variant

Revision ID: 9269b8353395
Revises: 52d20cb20392
Create Date: 2026-06-04 21:16:04.378537

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '9269b8353395'
down_revision = '52d20cb20392'
branch_labels = None
depends_on = None


digital_variant_enum = sa.Enum('enhanced', 'restyled', name='digital_variant')


def upgrade() -> None:
    op.add_column('pages', sa.Column('enhanced_path', sa.String(length=512), nullable=True))
    op.add_column('pages', sa.Column('restyled_path', sa.String(length=512), nullable=True))
    op.add_column('pages', sa.Column('text', sa.Text(), nullable=True))
    digital_variant_enum.create(op.get_bind(), checkfirst=True)
    op.add_column('works', sa.Column('digital_variant', digital_variant_enum, nullable=True))


def downgrade() -> None:
    op.drop_column('works', 'digital_variant')
    digital_variant_enum.drop(op.get_bind(), checkfirst=True)
    op.drop_column('pages', 'text')
    op.drop_column('pages', 'restyled_path')
    op.drop_column('pages', 'enhanced_path')
