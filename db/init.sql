-- Выполняется один раз при первой инициализации тома Postgres.
-- pgvector даёт тип `vector` и операторы расстояния для семантического поиска.
CREATE EXTENSION IF NOT EXISTS vector;
