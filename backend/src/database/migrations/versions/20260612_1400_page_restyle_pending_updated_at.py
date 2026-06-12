"""pages: add restyle_pending flag and updated_at timestamp

Revision ID: b7e2a4d18f03
Revises: a1c4f7e90b21
Create Date: 2026-06-12 14:00:00.000000

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = 'b7e2a4d18f03'
down_revision = 'a1c4f7e90b21'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "pages",
        sa.Column("restyle_pending", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column(
        "pages",
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )


def downgrade() -> None:
    op.drop_column("pages", "updated_at")
    op.drop_column("pages", "restyle_pending")
