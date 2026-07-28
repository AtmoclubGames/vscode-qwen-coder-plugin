export type MessengerType = 'TELEGRAM' | 'MAX' | 'BROWSER';

export interface UserInfo {
  id: string;
  firstName: string;
  lastName?: string;
  username?: string;
}

class MessengerSDK {
  private tg: any = null;
  private max: any = null;
  private type: MessengerType = 'BROWSER';

  constructor() {
    if (typeof window !== 'undefined') {
      const win = window as any;
      // Detect Telegram
      if (win.Telegram?.WebApp?.initData) {
        this.tg = win.Telegram.WebApp;
        this.type = 'TELEGRAM';
      }
      // Detect MAX
      else if (win.WebApp?.initData) {
        this.max = win.WebApp;
        this.type = 'MAX';
      }
    }
  }

  getMessenger(): MessengerType {
    return this.type;
  }

  ready(): void {
    if (this.type === 'TELEGRAM') {
      this.tg.ready();
    } else if (this.type === 'MAX') {
      // MAX WebApp object is initialized automatically, but trigger ready if method exists
      if (typeof this.max.ready === 'function') {
        this.max.ready();
      }
    }
  }

  getInitData(): string {
    if (this.type === 'TELEGRAM') {
      return this.tg.initData || '';
    } else if (this.type === 'MAX') {
      return this.max.initData || '';
    }
    // Return mock string for local browser testing
    return '';
  }

  getStartParam(): string {
    if (this.type === 'TELEGRAM') {
      return this.tg.initDataUnsafe?.start_param || '';
    } else if (this.type === 'MAX') {
      return this.max.initDataUnsafe?.start_param || '';
    }
    
    // Fallback for local browser testing: read from URL query/hash
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const queryParams = new URLSearchParams(window.location.search);
    return hashParams.get('pointId') || queryParams.get('pointId') || '';
  }

  getUser(): UserInfo {
    if (this.type === 'TELEGRAM' && this.tg.initDataUnsafe?.user) {
      const u = this.tg.initDataUnsafe.user;
      return {
        id: String(u.id),
        firstName: u.first_name || '',
        lastName: u.last_name || '',
        username: u.username || '',
      };
    } else if (this.type === 'MAX' && this.max.initDataUnsafe?.user) {
      const u = this.max.initDataUnsafe.user;
      return {
        id: String(u.id),
        firstName: u.first_name || '',
        lastName: u.last_name || '',
        username: u.username || '',
      };
    }

    return {
      id: 'test_user_id',
      firstName: 'Тестовый',
      lastName: 'Пользователь',
      username: 'test_user',
    };
  }

  close(): void {
    if (this.type === 'TELEGRAM') {
      this.tg.close();
    } else if (this.type === 'MAX' && typeof this.max.close === 'function') {
      this.max.close();
    } else {
      console.log('App closed (mock)');
    }
  }

  expand(): void {
    if (this.type === 'TELEGRAM') {
      this.tg.expand();
    }
    // MAX handles resizing natively, no explicit expand is required.
  }
}

const sdk = new MessengerSDK();
export default sdk;
