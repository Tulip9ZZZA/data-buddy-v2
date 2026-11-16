CREATE TABLE `auditFindings` (
	`id` varchar(64) NOT NULL,
	`reportId` varchar(36) NOT NULL,
	`ruleId` varchar(200) NOT NULL,
	`severity` enum('blocker','review','info') NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text NOT NULL,
	`columnName` varchar(255),
	`affectedCount` int NOT NULL,
	`evidenceJson` text NOT NULL,
	`remediationAction` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auditFindings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `auditRemediations` (
	`id` varchar(64) NOT NULL,
	`reportId` varchar(36) NOT NULL,
	`action` varchar(64) NOT NULL,
	`ledgerJson` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auditRemediations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `auditReports` (
	`id` varchar(36) NOT NULL,
	`userId` int NOT NULL,
	`datasetName` varchar(255) NOT NULL,
	`sourceFormat` varchar(24) NOT NULL,
	`rowCount` int NOT NULL,
	`columnCount` int NOT NULL,
	`completeness` int NOT NULL,
	`blockerCount` int NOT NULL,
	`reviewCount` int NOT NULL,
	`infoCount` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auditReports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `auditFindings_report_idx` ON `auditFindings` (`reportId`);--> statement-breakpoint
CREATE INDEX `auditRemediations_report_idx` ON `auditRemediations` (`reportId`);--> statement-breakpoint
CREATE INDEX `auditReports_user_created_idx` ON `auditReports` (`userId`,`createdAt`);