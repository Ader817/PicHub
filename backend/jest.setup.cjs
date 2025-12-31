process.env.DB_DIALECT = "sqlite";
process.env.DB_SQLITE_STORAGE = ":memory:";
process.env.JWT_SECRET = "test_secret";
process.env.UPLOADS_DIR = `${process.cwd()}/.tmp_uploads`;
