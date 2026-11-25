PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS accounts (
  id INTEGER PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS profiles (
  account_id INTEGER PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  country TEXT NOT NULL,
  university TEXT NOT NULL,
  course TEXT NOT NULL,
  interests TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY,
  sender_id INTEGER NOT NULL REFERENCES profiles(account_id),
  recipient_id INTEGER NOT NULL REFERENCES profiles(account_id),
  body TEXT NOT NULL CHECK (length(trim(body)) BETWEEN 1 AND 500),
  sent_at INTEGER NOT NULL,
  CHECK (sender_id <> recipient_id)
);

CREATE INDEX IF NOT EXISTS messages_by_pair ON messages(sender_id, recipient_id, id);

CREATE TABLE IF NOT EXISTS cleared_histories (
  account_id INTEGER NOT NULL REFERENCES profiles(account_id),
  peer_id INTEGER NOT NULL REFERENCES profiles(account_id),
  last_hidden_message_id INTEGER NOT NULL CHECK (last_hidden_message_id >= 0),
  PRIMARY KEY (account_id, peer_id),
  CHECK (account_id <> peer_id)
);

CREATE TABLE IF NOT EXISTS friendships (
  account_a INTEGER NOT NULL REFERENCES profiles(account_id),
  account_b INTEGER NOT NULL REFERENCES profiles(account_id),
  sender_id INTEGER NOT NULL REFERENCES profiles(account_id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted')),
  PRIMARY KEY (account_a, account_b),
  CHECK (account_a < account_b AND sender_id IN (account_a, account_b))
);

CREATE INDEX IF NOT EXISTS friendships_by_account_b ON friendships(account_b);
