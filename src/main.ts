import { Plugin, Notice } from "obsidian";
import PluginSyncSettingTab from "./settings";

interface PluginSyncSettings {
	serverUrl: string;
	pollInterval: number;
	enabled: boolean;
	selectedPluginId: string;
}

const DEFAULT_SETTINGS: PluginSyncSettings = {
	serverUrl: "http://192.168.1.100:8080",
	pollInterval: 2000,
	enabled: true,
	selectedPluginId: "",
};

export default class PluginSyncPlugin extends Plugin {
	settings!: PluginSyncSettings;
	intervalId!: number;

	async onload() {
		await this.loadSettings();

		// 設定タブを追加
		this.addSettingTab(new PluginSyncSettingTab(this.app, this));

		// ポーリング開始
		if (this.settings.enabled) {
			this.startPolling();
		}

		// コマンド追加
		this.addCommand({
			id: "manual-sync",
			name: "手動同期",
			callback: () => this.checkForUpdates(),
		});
	}

	getInstalledPlugins(): Array<{ id: string; name: string }> {
		const plugins: Array<{ id: string; name: string }> = [];
		const pluginManifests = (this.app as any).plugins.manifests;

		for (const pluginId in pluginManifests) {
			plugins.push({
				id: pluginId,
				name: pluginManifests[pluginId].name || pluginId,
			});
		}

		return plugins.sort((a, b) => a.name.localeCompare(b.name));
	}

	startPolling() {
		this.intervalId = window.setInterval(
			() => this.checkForUpdates(),
			this.settings.pollInterval
		);
	}

	stopPolling() {
		if (this.intervalId) {
			window.clearInterval(this.intervalId);
		}
	}

	async checkForUpdates() {
		try {
			// 変更があったファイルのリストを取得
			const response = await fetch(
				`${this.settings.serverUrl}/api/check-updates`
			);

			if (!response.ok) {
				throw new Error("Server connection failed");
			}

			const { files } = await response.json();

			if (files.length === 0) return;

			// 各ファイルをダウンロードして保存
			for (const fileInfo of files) {
				await this.downloadAndSaveFile(fileInfo.path);
			}

			// 更新通知
			new Notice(`${files.length}個のファイルを更新しました`);

			// サーバー側のリストをクリア
			await fetch(`${this.settings.serverUrl}/api/clear-updates`, {
				method: "POST",
			});
		} catch (error) {
			console.error("Sync error:", error);
		}
	}

	async downloadAndSaveFile(relativePath: string) {
		try {
			// ファイル内容を取得
			const response = await fetch(
				`${this.settings.serverUrl}/api/file?name=${encodeURIComponent(
					relativePath
				)}`
			);

			const { filename, content } = await response.json();

			// プラグインフォルダに保存
			// 例: .obsidian/plugins/my-plugin/main.js
			if (!this.settings.selectedPluginId) {
				console.error("プラグインが選択されていません");
				return;
			}

			const pluginPath = `.obsidian/plugins/${this.settings.selectedPluginId}/${filename}`;

			await this.app.vault.adapter.write(pluginPath, content);

			console.log(`Updated: ${pluginPath}`);
		} catch (error) {
			console.error(`Failed to download ${relativePath}:`, error);
		}
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	onunload() {
		this.stopPolling();
	}
}
