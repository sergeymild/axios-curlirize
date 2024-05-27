import { CurlHelper } from "./lib/CurlHelper";
import type {
  AxiosInstance,
  AxiosRequestConfig
} from "axios";

export const generateCurlCommand = (req: AxiosRequestConfig) => {
  const curl = new CurlHelper(req);
  return curl.generateCommand();
}

type ON_401 = (url: string) => void
const requestMeasure = new Map();
export const logAxiosResponse = (params: {
  axiosInstance: AxiosInstance,
  on401?: ON_401,
  logger?: (message?: any, ...optionalParams: any[]) => void,
}) => {
  params.axiosInstance.interceptors.request.use((config) => {
    const url = config.url || config.baseURL;
    requestMeasure.set(url, Date.now())
    return config
  }, logAxiosReject({logger: params.logger, on401: params.on401}))

  params.axiosInstance.interceptors.response.use((config) => {
    let baseUrl = config.config.baseURL;
    if (baseUrl?.endsWith("/") !== true && config.config.url?.startsWith("/") !== true) {
      baseUrl += "/"
    }

    const url = config.config.url || config.config.baseURL;
    let requestTime;
    const start = requestMeasure.get(url);
    requestMeasure.delete(url);
    if (start) requestTime = (Date.now() - start) / 1000;

    // @ts-ignore
    const logger = params.logger ?? console.log
    logger('[REQUEST]', generateCurlCommand(config.config));
    const curly = new CurlHelper(config.config)
    logger(
      '[RESPONSE]',
      JSON.stringify({
        url: curly.getBuiltURL(),
        method: config.config.method,
        status: config.status,
        tookTime: requestTime,
        data: config.data,
      }),
      '\n\n',
    );

    return config
  }, logAxiosReject({logger: params.logger, on401: params.on401}))
}

export const AXIOS_TIME_OUT_ERROR_KEY = "AXIOS_TIME_OUT_ERROR_KEY"
export const logAxiosReject = (params: {
  logger?: (message?: any, ...optionalParams: any[]) => void,
  on401?: ON_401
}) => {
  return (error: any) => {
    // @ts-ignore
    const logger = params.logger ?? console.log
    if (error.toString().includes("CanceledError: canceled")) {
      logger(`[ERROR.REQUEST] Cancelled`);
      throw {response: {status: -1, code: 'canceled'}}
    }
    try {
      if (typeof error === 'string') {
        throw new Error(error);
      }

      if ('config' in error) {
        logger(`[ERROR.REQUEST] ${generateCurlCommand(error.config) ?? 'UNKNOWN_CURL'}`);
        if ('message' in error && error.message === AXIOS_TIME_OUT_ERROR_KEY) {
          logger(`[ERROR.RESPONSE] TIMEOUT_ERROR: [${error.request?._url ?? 'unknown'}]`);
          throw error;
        }
        if ('response' in error) {
          const config = error.response;
          const code = config.status;
          const statusText = config.statusText;
          const data = config.data;
          if (config === 401 && params.on401) {
            logger(`[ERROR.RESPONSE.FIRST.CHECK.401]`)
            params.on401(config.url)
            throw error;
          }
          logger(
            `[ERROR.RESPONSE] ${JSON.stringify({
              code,
              statusText,
              data,
              url: error.request?._url ?? 'unknown',
            })}`,
          );
        }
      }

      if ('response' in error && error?.response?.status === 401 && params.on401) {
        logger(`[ERROR.RESPONSE.LAST.CHECK.401]`)
        params.on401(error.config.url)
      }

      throw error;
    } catch (e) {
      logger(`[ERROR.RESPONSE.CATCH_ERROR]`, e)
      throw e
    }
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
