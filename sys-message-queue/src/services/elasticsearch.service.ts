"use strict";

import { Client } from "@elastic/elasticsearch";
import { getClients, initElasticsearch } from "../dbs/init.elasticsearch";

initElasticsearch({});

const client = getClients().instanceConnect;

const createDocument = async ({
  index,
  document,
}: {
  index: string;
  document: any;
}) => {
  return await client.index({
    index,
    body: document,
    refresh: "wait_for",
  });
};

export { createDocument };
