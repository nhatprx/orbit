INSERT INTO modules (module_key, name, description, scope, sort_order)
VALUES ('slides', 'Slides', 'Presentation decks', 'BOTH', 7)
ON CONFLICT (module_key) DO NOTHING;
