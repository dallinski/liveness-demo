import {v4 as uuidv4} from "uuid";
import _ from "lodash";

// TODO: define with valid variables
const OCR_LABS_AUTH_URL = "";
const OCR_LABS_STREAMING_API_KEY = "";
const OCR_LABS_STREAMING_URL = "";

/**
 * The built-in `Object` type actually means "any non-nullish value", so it is marginally better
 * than `unknown`.
 *
 * Likewise, the `object` type is recommended against by eslint's ban-types, for reasons that are
 * slightly hard to follow.
 * @see https://bit.ly/3OCFKSu eslint's ban-types docs
 *
 * While this type is also relatively week, it is still better than using `Object` or `object`.
 */
export type JSObject = Record<string, unknown>;

export class OauthJwt {
  public accessToken: string;
  private tokenType: string;
  private expiresIn: number;
  private sentAt: Date;

  constructor(expiresIn: number, tokenType: string, sentAt: Date, accessToken: string) {
    this.tokenType = tokenType;
    this.expiresIn = expiresIn;
    this.sentAt = sentAt;
    this.accessToken = accessToken;
  }

  public expired = () => {
    return this.sentAt.getTime() + (this.safeExpireAt() * 1000) <= new Date().getTime();
  }

  // Refresh token 60 seconds earlier than it expires so it doesn't expire while using it
  private safeExpireAt = () => {
    return this.expiresIn - 60;
  }
}

export class Api {
  private currentOauthJwt: OauthJwt | null = null;

  constructor() {
  }

  async post({json, route, headers}: { json: JSObject; route: string; headers?: { [key: string]: string }; }) {
    return this.request({route, body: JSON.stringify(json), method: "POST", headers: headers});
  }

  async createOCRLabsSession(): Promise<{ session_id: string; transaction_id: string; }> {
    const oauthJwt = await this.getOauthJwt();
    const transactionId = uuidv4();

    return this.postResource<{ session_id: string; }>({
      path:`${OCR_LABS_STREAMING_URL}/v1/session`,
      headers: {
        'Authorization': `Bearer ${oauthJwt.accessToken}`,
        'Content-Type': 'application/json'
      },
      json: {
        tx_id: transactionId
      },
      expectedStatus: 200
    }).then((data) => {
      return {
        session_id: data.session_id,
        transaction_id: transactionId
      };
    });
  }

  private createOauthJwt = async (): Promise<OauthJwt> => {
    const data = await fetch(`${OCR_LABS_AUTH_URL}/oauth2/token?grant_type=client_credentials&scope=com.ocrlabs.liveness.api/results:read`, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${OCR_LABS_STREAMING_API_KEY}`
      },
      body: JSON.stringify({})
    });

    const json = await data.json();

    return new OauthJwt(json.expires_in, json.token_type, new Date(), json.access_token);
  }

  private getOauthJwt = async () => {
    if (!this.currentOauthJwt || this.currentOauthJwt.expired()) {
      this.currentOauthJwt = await this.createOauthJwt();
    }

    return this.currentOauthJwt;
  }

  private async postResource<T = any>({
                                        path,
                                        headers,
                                        json,
                                        expectedStatus,
                                        acceptableErrors
                                      }: {
    path: string;
    headers?: { [key: string]: string };
    json: JSObject;
    expectedStatus: number | [number, ...number[]];
    acceptableErrors?: string[];
  }): Promise<T> {
    const {data, status} = await this.post({
      json,
      route: path,
      headers: headers
    });
    if (
      !_.castArray(expectedStatus).includes(status) &&
      !(acceptableErrors && acceptableErrors.includes(data?.error))
    )
      throw new Error(
        `POST ${path} failed! Expected ${expectedStatus} but got ${status}. Body:${JSON.stringify(
          data
        )}`
      );
    return data && data.error ? data.error : data;
  }

  private async request({
                          body,
                          headers,
                          route,
                          method
                        }: {
    body: null | string;
    headers?: { [key: string]: string };
    route: string;
    method: "GET" | "POST";
  }) {
    const result = await fetch(route, {
      method,
      mode: "cors",
      headers: headers || {},
      body
    });
    const responseBody = await result.text();
    const data = this.emptyResponse(result.status)
      ? null
      : JSON.parse(responseBody);

    // result is ok for any status code in the 200-299 range
    if (!result.ok) {
      console.error(`${result.status} ${result.statusText}`);
    }

    return {
      status: result.status,
      headers: [],
      data
    };
  }

  private emptyResponse(status: number) {
    return [204, 205].includes(status);
  }
}
