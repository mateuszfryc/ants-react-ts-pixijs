export type ResponseParams = { data: number | number[] | number[][] };
export type WorkerResponse = (params: ResponseParams) => void;

export function setupWorker(workerResponse: WorkerResponse): Worker {
  window.URL = window.URL || window.webkitURL;

  const safeResponse = workerResponse.toString().replace('"use strict";', '');
  const workerContent = `self.onmessage = ${safeResponse}`;

  const blob = new Blob([workerContent], { type: 'application/javascript' });

  return new Worker(URL.createObjectURL(blob));
}
