"use client";

import React, { useEffect, useState } from "react";
import classNames from "classnames/bind";
import styles from "../../../styles/CompanyClient.module.scss";
import { getDocumentsElastic, searchCompaniesWithElastic } from "@/config/api";
import { ICompany, IMeta } from "@/types/backend";
import CompanyCard from "@/components/client/Company/Company.card";
import { Flex, Pagination, Result, Spin } from "antd";
import CompanyPagination from "@/components/client/Company/Company.pagination";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLocation, faSearch } from "@fortawesome/free-solid-svg-icons";
import { LoadingOutlined } from "@ant-design/icons";
import SearchComponent from "@/components/client/Company/Company.search";
import "../../../styles/SearchComponent.scss";

const cx = classNames.bind(styles);

const PAGE_SIZE = 9;

const CompanyClient = (props: any) => {
  const [companies, setCompanies] = useState<ICompany[]>([]);

  const [current, setCurrent] = useState(props.searchParams?.page || 1);

  const [meta, setMeta] = useState<IMeta>();

  const [searchValue, setSearchValue] = useState("");

  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(false);

  const [shouldRender, setShouldRender] = useState(false);

  const handleChange = (e: any) => {
    setSearchValue(e.target.value);
  };

  const handleKeyDown = async (e: any) => {
    if (e.key === "Enter") {
      setSearch(searchValue);
    }
  };

  useEffect(() => {
    setLoading(true);
    if (search) {
      const fetchData = async () => {
        const res = await searchCompaniesWithElastic({
          index: "companies",
          query: searchValue,
          size: PAGE_SIZE + "",
          from: (current - 1) * PAGE_SIZE + "",
        });

        setCompanies(
          res?.data.hits.map((item: any) => {
            const res = {
              ...item._source,
              _id: item._source.mongo_id,
            } as ICompany;
            return res;
          }) as ICompany[]
        );
        const temp = {
          current: current,
          pageSize: PAGE_SIZE,
          pages: Math.ceil((res?.data.total.value as number) / PAGE_SIZE),
          total: res?.data.total.value as number,
        } as IMeta;
        setMeta(temp);
        setShouldRender(true);
      };

      fetchData();
    } else {
      const fetchData = async () => {
        const res = await getDocumentsElastic({
          index: "companies",
          size: PAGE_SIZE + "",
          from: (current - 1) * PAGE_SIZE + "",
        });

        setCompanies(
          res?.data.hits.map((item: any) => {
            const res = {
              ...item._source,
              _id: item._id,
            } as ICompany;
            return res;
          }) as ICompany[]
        );
        const temp = {
          current: current,
          pageSize: PAGE_SIZE,
          pages: Math.ceil((res?.data.total.value as number) / PAGE_SIZE),
          total: res?.data.total.value as number,
        } as IMeta;
        setMeta(temp);
        setShouldRender(true);
      };

      fetchData();
    }
    setLoading(false);
  }, [current, search]);

  return (
    <div className={cx("wrapper")}>
      <div className={cx("container")}>
        <SearchComponent
          handleChange={handleChange}
          handleKeyDown={handleKeyDown}
        />
        {!loading && shouldRender ? (
          companies.length > 0 ? (
            <div className={cx("content")}>
              {companies?.map((item: ICompany) => {
                return <CompanyCard key={item._id} result={item} meta={meta} />;
              })}
            </div>
          ) : (
            <Result status="404" title="Không tìm thấy kết quả" />
          )
        ) : (
          <Flex
            justify="center"
            style={{ margin: "25px 0" }}
            align="center"
            gap="middle"
          >
            <Spin
              indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />}
            />
          </Flex>
        )}
        {meta && companies.length > 0 && (
          <div className={cx("pagination")}>
            <CompanyPagination
              meta={meta}
              setMeta={setMeta}
              setCurrent={setCurrent}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default CompanyClient;
