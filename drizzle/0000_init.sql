CREATE TABLE `skills` (
  `id` text PRIMARY KEY NOT NULL,
  `slug` text NOT NULL,
  `name` text NOT NULL,
  `description` text,
  `frontmatter` text,
  `body` text,
  `dir_path` text NOT NULL,
  `source` text DEFAULT 'local',
  `category` text,
  `business_scene` text,
  `notes` text,
  `install_count` integer DEFAULT 0,
  `file_mtime` integer,
  `file_hash` text,
  `git_remote` text,
  `git_branch` text,
  `status` text DEFAULT 'ok',
  `created_at` integer DEFAULT (unixepoch()) NOT NULL,
  `updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `skills_slug_unique` ON `skills` (`slug`);
--> statement-breakpoint
CREATE UNIQUE INDEX `skills_dir_path_unique` ON `skills` (`dir_path`);
--> statement-breakpoint
CREATE INDEX `skills_name_idx` ON `skills` (`name`);
--> statement-breakpoint
CREATE TABLE `skill_versions` (
  `id` text PRIMARY KEY NOT NULL,
  `skill_id` text,
  `content` text NOT NULL,
  `note` text,
  `created_at` integer DEFAULT (unixepoch()) NOT NULL,
  FOREIGN KEY (`skill_id`) REFERENCES `skills`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `skill_versions_skill_id_idx` ON `skill_versions` (`skill_id`);
--> statement-breakpoint
CREATE TABLE `tags` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `color` text,
  `created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tags_name_unique` ON `tags` (`name`);
--> statement-breakpoint
CREATE TABLE `skill_tags` (
  `skill_id` text NOT NULL,
  `tag_id` text NOT NULL,
  PRIMARY KEY (`skill_id`, `tag_id`),
  FOREIGN KEY (`skill_id`) REFERENCES `skills`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `skill_tags_tag_id_idx` ON `skill_tags` (`tag_id`);
--> statement-breakpoint
CREATE TABLE `projects` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `path` text,
  `created_at` integer DEFAULT (unixepoch()) NOT NULL,
  `updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `projects_name_unique` ON `projects` (`name`);
--> statement-breakpoint
CREATE TABLE `skill_projects` (
  `skill_id` text NOT NULL,
  `project_id` text NOT NULL,
  PRIMARY KEY (`skill_id`, `project_id`),
  FOREIGN KEY (`skill_id`) REFERENCES `skills`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `skill_projects_project_id_idx` ON `skill_projects` (`project_id`);
--> statement-breakpoint
CREATE TABLE `tools` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `global_path` text NOT NULL,
  `project_path` text NOT NULL,
  `enabled` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `skill_tools` (
  `skill_id` text NOT NULL,
  `tool_id` text NOT NULL,
  PRIMARY KEY (`skill_id`, `tool_id`),
  FOREIGN KEY (`skill_id`) REFERENCES `skills`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`tool_id`) REFERENCES `tools`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `skill_tools_tool_id_idx` ON `skill_tools` (`tool_id`);
--> statement-breakpoint
CREATE TABLE `providers` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `base_url` text NOT NULL,
  `api_key` text NOT NULL,
  `model` text NOT NULL,
  `enabled` integer DEFAULT 1
);
--> statement-breakpoint
CREATE TABLE `agents` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `description` text,
  `system_prompt` text,
  `provider_id` text,
  `created_at` integer DEFAULT (unixepoch()) NOT NULL,
  `updated_at` integer DEFAULT (unixepoch()) NOT NULL,
  FOREIGN KEY (`provider_id`) REFERENCES `providers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `agent_skills` (
  `agent_id` text NOT NULL,
  `skill_id` text NOT NULL,
  `order_index` integer NOT NULL,
  PRIMARY KEY (`agent_id`, `skill_id`),
  FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`skill_id`) REFERENCES `skills`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `agent_skills_order_unique` ON `agent_skills` (`agent_id`, `order_index`);
--> statement-breakpoint
CREATE INDEX `agent_skills_skill_id_idx` ON `agent_skills` (`skill_id`);
--> statement-breakpoint
CREATE TABLE `test_cases` (
  `id` text PRIMARY KEY NOT NULL,
  `agent_id` text,
  `name` text NOT NULL,
  `user_input` text NOT NULL,
  `context` text,
  `expected` text,
  `created_at` integer DEFAULT (unixepoch()) NOT NULL,
  FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `test_cases_agent_id_idx` ON `test_cases` (`agent_id`);
--> statement-breakpoint
CREATE TABLE `test_runs` (
  `id` text PRIMARY KEY NOT NULL,
  `case_id` text,
  `provider_id` text,
  `model` text NOT NULL,
  `with_agent` integer NOT NULL,
  `skill_snapshot` text NOT NULL,
  `system_prompt` text,
  `output` text,
  `input_tokens` integer,
  `output_tokens` integer,
  `latency_ms` integer,
  `score` integer,
  `score_note` text,
  `error` text,
  `created_at` integer DEFAULT (unixepoch()) NOT NULL,
  FOREIGN KEY (`case_id`) REFERENCES `test_cases`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `test_runs_case_id_idx` ON `test_runs` (`case_id`);
