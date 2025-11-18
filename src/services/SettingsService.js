import { database } from '../services/StorageService';
import { EventBus } from './utils/EventBus';

export class SettingsService {
  static async getSetting(key) {
    const setting = await database.options.get(key);
    return setting ? setting.value : null;
  }
  static async setSetting(key, value) {
    await database.options.put({ uuid: key, key, value });
    const eventBus = EventBus.getInstance();
    eventBus.emit('setting:updated', { key, value });
  }

  static async getSettings() {
    const settings = await database.options.toArray();
    return settings.reduce((acc, { key, value }) => {
      acc[key] = value;
      return acc;
    }, {});
  }

  static async updateSettings(newSettings) {
    const promises = Object.entries(newSettings).map(([key, value]) =>
      database.options.put({ uuid: key, key, value })
    );
    await Promise.all(promises);
    const eventBus = EventBus.getInstance();
    eventBus.emit('settings:updated', newSettings);
    Object.entries(newSettings).forEach(([key, value]) => {
      eventBus.emit('setting:updated', { key, value });
    });
  }

  static async deleteSetting(key) {
    await database.options.delete(key);
    const eventBus = EventBus.getInstance();
    eventBus.emit('setting:deleted', key);
  }

  static async resetSettings() {
    await database.options.clear();
    const eventBus = EventBus.getInstance();
    eventBus.emit('settings:reset');
  }
}