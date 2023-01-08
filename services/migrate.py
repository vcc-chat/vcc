from peewee_migrate import Router

import models

db = models.get_database()

models.bind_model(models.User, db)
models.bind_model(models.Chat, db)
models.bind_model(models.ChatUser, db)

router = Router(db)

router.create(auto=models)
router.run()
