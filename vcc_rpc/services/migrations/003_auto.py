"""Peewee migrations -- 003_auto.py.

Some examples (model - class or model name)::

    > Model = migrator.orm['model_name']            # Return model in current state by name

    > migrator.sql(sql)                             # Run custom SQL
    > migrator.python(func, *args, **kwargs)        # Run python code
    > migrator.create_model(Model)                  # Create a model (could be used as decorator)
    > migrator.remove_model(model, cascade=True)    # Remove a model
    > migrator.add_fields(model, **fields)          # Add fields to a model
    > migrator.change_fields(model, **fields)       # Change fields
    > migrator.remove_fields(model, *field_names, cascade=True)
    > migrator.rename_field(model, old_field_name, new_field_name)
    > migrator.rename_table(model, new_table_name)
    > migrator.add_index(model, *col_names, unique=False)
    > migrator.drop_index(model, *col_names)
    > migrator.add_not_null(model, *field_names)
    > migrator.drop_not_null(model, *field_names)
    > migrator.add_default(model, field_name, default)

"""

import datetime as dt
import peewee as pw
from peewee_migrate import Migrator
from decimal import ROUND_HALF_EVEN

try:
    import playhouse.postgres_ext as pw_pext
except ImportError:
    pass

SQL = pw.SQL


def migrate(migrator: Migrator, database, fake=False, **kwargs):
    """Write your migrations here."""

    @migrator.create_model
    class Chat(pw.Model):
        id = pw.BigAutoField()
        name = pw.CharField(max_length=20)
        parent = pw.ForeignKeyField(
            column_name="parent_id", field="id", model="self", null=True
        )
        public = pw.BooleanField(constraints=[SQL("DEFAULT True")], default=True)

        class Meta:
            table_name = "chat"

    @migrator.create_model
    class User(pw.Model):
        id = pw.BigAutoField()
        name = pw.CharField(max_length=16, unique=True)
        password = pw.CharField(max_length=16)
        salt = pw.CharField(max_length=255)
        online_count = pw.IntegerField(constraints=[SQL("DEFAULT 0")], default=0)
        login = pw.BooleanField(constraints=[SQL("DEFAULT True")], default=True)

        class Meta:
            table_name = "user"

    @migrator.create_model
    class ChatUser(pw.Model):
        id = pw.BigAutoField()
        user = pw.ForeignKeyField(
            column_name="user_id", field="id", model=migrator.orm["user"]
        )
        chat = pw.ForeignKeyField(
            column_name="chat_id", field="id", model=migrator.orm["chat"]
        )
        permissions = pw.BitField(constraints=[SQL("DEFAULT 80")], default=80)

        class Meta:
            table_name = "chatuser"


def rollback(migrator: Migrator, database, fake=False, **kwargs):
    """Write your rollback migrations here."""

    migrator.remove_model("chatuser")

    migrator.remove_model("user")

    migrator.remove_model("chat")
