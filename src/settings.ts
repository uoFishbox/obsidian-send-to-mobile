import { App, PluginSettingTab, Setting } from "obsidian";
import PluginSyncPlugin from "./main";

export default class PluginSyncSettingTab extends PluginSettingTab {
	plugin: PluginSyncPlugin;

	constructor(app: App, plugin: PluginSyncPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		// プラグイン選択設定
		new Setting(containerEl)
			.setName("対象プラグイン")
			.setDesc("同期するプラグインを選択")
			.addDropdown((dropdown) => {
				const plugins = this.plugin.getInstalledPlugins();

				// 空のオプションを追加
				dropdown.addOption("", "プラグインを選択してください");

				// インストール済みプラグインを追加
				plugins.forEach((plugin) => {
					dropdown.addOption(plugin.id, plugin.name);
				});

				dropdown
					.setValue(this.plugin.settings.selectedPluginId)
					.onChange(async (value) => {
						this.plugin.settings.selectedPluginId = value;
						await this.plugin.saveSettings();
					});
			});

		// Server URL設定
		new Setting(containerEl)
			.setName("サーバーURL")
			.setDesc("同期サーバーのURL")
			.addText((text) =>
				text
					.setPlaceholder("http://192.168.1.100:8080")
					.setValue(this.plugin.settings.serverUrl)
					.onChange(async (value) => {
						this.plugin.settings.serverUrl = value;
						await this.plugin.saveSettings();
					})
			);

		// Poll Interval設定
		new Setting(containerEl)
			.setName("ポーリング間隔")
			.setDesc("更新チェックの間隔（ミリ秒）")
			.addText((text) =>
				text
					.setPlaceholder("5000")
					.setValue(this.plugin.settings.pollInterval.toString())
					.onChange(async (value) => {
						this.plugin.settings.pollInterval = parseInt(value);
						await this.plugin.saveSettings();
						// ポーリングを再開
						this.plugin.stopPolling();
						if (this.plugin.settings.enabled) {
							this.plugin.startPolling();
						}
					})
			);

		// Enabled設定
		new Setting(containerEl)
			.setName("有効化")
			.setDesc("自動同期を有効にする")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.enabled)
					.onChange(async (value) => {
						this.plugin.settings.enabled = value;
						await this.plugin.saveSettings();
						if (value) {
							this.plugin.startPolling();
						} else {
							this.plugin.stopPolling();
						}
					})
			);
	}
}
