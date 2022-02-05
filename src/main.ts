import { CurlHelper } from "./lib/CurlHelper";
import type {AxiosInstance, AxiosRequestConfig} from "axios";
import {config} from "chai";

export const generateCurlCommand = (req: AxiosRequestConfig) => {
  const curl = new CurlHelper(req);
  return curl.generateCommand();
}

const requestMeasure = new Map();
export const logAxiosResponse = (params: {
  axiosInstance: AxiosInstance,
  measureRequest: boolean,
  logger?: (message?: any, ...optionalParams: any[]) => void,
}) => {
  if (requestMeasure) {
    params.axiosInstance.interceptors.request.use((config) => {
      const url = config.url || config.baseURL;
      requestMeasure.set(url, Date.now())
      return config
    })
  }
  params.axiosInstance.interceptors.response.use((config) => {
    const url = config.config.url || config.config.baseURL;
    let requestTime;
    if (params.measureRequest) {
      const start = requestMeasure.get(url);
      requestMeasure.delete(url);
      if (start) {
        requestTime = (Date.now() - start) / 1000;
      }
    }

    // @ts-ignore
    const logger = params.logger ?? console.log
    logger('[REQUEST]', generateCurlCommand(config.config));
    logger(
      '[RESPONSE]',
      JSON.stringify({
        url: `${config.config.baseURL}/${config.config.url}`,
        method: config.config.method,
        status: config.status,
        tookTime: requestTime,
        data: config.data,
      }),
      '\n\n',
    );

    return config
  })
}

export const AXIOS_TIME_OUT_ERROR_KEY = "AXIOS_TIME_OUT_ERROR_KEY"
export const logAxiosReject = (params: {
  logger?: (message?: any, ...optionalParams: any[]) => void,
  on401?: (url: string) => void
}) => {
  return (error: any) => {
    if (typeof error === 'string') {
      throw new Error(error);
    }

    // @ts-ignore
    const logger = params.logger ?? console.log
    if ('config' in error) {
      logger(`[REQUEST.ERROR.CURL] ${generateCurlCommand(error.config) ?? 'UNKNOWN_CURL'}`);
      if ('message' in error && error.message === AXIOS_TIME_OUT_ERROR_KEY) {
        logger(`[REQUEST.ERROR.RESPONSE] TIMEOUT_ERROR: [${error.request?._url ?? 'unknown'}]`);
        throw error;
      }
      if ('response' in error) {
        const config = error.response;
        const code = config.status;
        const statusText = config.statusText;
        const data = config.data;
        if (config === 401 && params.on401) {
          logger(`[REQUEST.ERROR.RESPONSE.FIRST.CHECK.401]`)
          params.on401(config.url)
          throw error;
        }
        logger(
          `[REQUEST.ERROR.RESPONSE] ${JSON.stringify({
            code,
            statusText,
            data,
            url: error.request?._url ?? 'unknown',
          })}`,
        );
      }
    }

    if ('response' in error && error?.response?.status === 401 && params.on401) {
      logger(`[REQUEST.ERROR.RESPONSE.LAST.CHECK.401]`)
      params.on401(error.config.url)
    }

    throw error;
  }
}

// @ts-ignore
export const curlirize = (instance: AxiosInstance, callback = console.log) => {
  instance.interceptors.request.use((req) => {
    try {
      const curl = new CurlHelper(req);
      //@ts-ignore
      req.curlObject = curl;
      //@ts-ignore
      req.curlCommand = curl.generateCommand();
      //@ts-ignore
      req.clearCurl = () => {
        //@ts-ignore
        delete req.curlObject;
        //@ts-ignore
        delete req.curlCommand;
        //@ts-ignore
        delete req.clearCurl;
      };
    } catch (err) {
      // Even if the axios middleware is stopped, no error should occur outside.
      callback(null, err);
    } finally {
      //@ts-ignore
      if (req.curlirize !== false) {
        callback({
          //@ts-ignore
          command: req.curlCommand,
          //@ts-ignore
          object: req.curlObject
        });
      }
      return req;
    }
  });
}

// export default (instance, callback = defaultLogCallback) => {

// };

