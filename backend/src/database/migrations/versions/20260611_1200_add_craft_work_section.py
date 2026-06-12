"""add 'craft' value to work_section enum

Revision ID: a1c4f7e90b21
Revises: 783f2d250106
Create Date: 2026-06-11 12:00:00.000000

"""
from alembic import op


# revision identifiers, used by Alembic.
revision = 'a1c4f7e90b21'
down_revision = '783f2d250106'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Postgres forbids ALTER TYPE ... ADD VALUE inside a transaction block, so
    # run it in an autocommit block. IF NOT EXISTS keeps the migration idempotent.
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE work_section ADD VALUE IF NOT EXISTS 'craft'")


def downgrade() -> None:
    # Postgres has no DROP VALUE for enums; removing it would require recreating
    # the type and rewriting every dependent column. Leaving the value in place
    # is harmless, so the downgrade is intentionally a no-op.
    pass
