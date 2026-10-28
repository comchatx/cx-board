A board beside the chat, where cx leaves what it found, what it changed, what it proposes and what it asks.

Each entry is a Markdown file cx writes under `/tenant/board/<person>/todo/`. The seller reads it in a column at the chat's right, marks it read or dismisses it, and answers what cx asks. Every answer goes to cx at once, as one message. What is done stays readable under `done/`, and nothing on the board is deleted.

The package holds one skill, which tells cx where the board is, what an entry's file holds and how the seller's answers come back. The column is drawn by ComChatX while the package is installed.
