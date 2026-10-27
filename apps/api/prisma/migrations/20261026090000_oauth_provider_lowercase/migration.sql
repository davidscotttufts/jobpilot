-- Values match the wire enum, so the API needs no case mapping.
ALTER TYPE "oauth_provider" RENAME VALUE 'GOOGLE' TO 'google';
ALTER TYPE "oauth_provider" RENAME VALUE 'GITHUB' TO 'github';
