import {Api} from "./api";

export class OCRLabs {
  private readonly api: Api;

  constructor() {
    this.api = new Api();
  }

  async createSession(): Promise<{ session_id: string; transaction_id: string; }> {
    return await this.api.createOCRLabsSession();
  }
}
