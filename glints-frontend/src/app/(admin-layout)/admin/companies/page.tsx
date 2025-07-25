"use client";
import React, { useEffect, useState } from "react";
import { ICompany } from "@/types/backend";
import { fetchCompanies } from "@/config/api";
import Access from "@/components/admin/Access/Access";
import { ALL_PERMISSIONS } from "@/config/permissions";
import CompanyTable from "@/components/admin/Company/Company.table";
import { useSearchParams } from "next/navigation";
import { useAppSelector } from "@/lib/redux/hooks";

const Companies = (props: any) => {
  const param = useSearchParams();
  const current = (param.get("page") as unknown as number) || 1;
  const [companies, setCompanies] = useState<ICompany[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [meta, setMeta] = useState<any>(null);
  const [reload, setReload] = useState(false);
  const user = useAppSelector((state: any) => state.auth.user);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const role = user?.role?.name;
      console.log("role", role);
      const res = await fetchCompanies(
        current,
        role === "HR" ? user.email : undefined
      );
      setCompanies(res?.data?.result || []);
      setMeta(res?.data?.meta);
      setLoading(false);
    };

    fetchData();
  }, [current, reload]);

  return (
    <Access permission={ALL_PERMISSIONS.COMPANIES.GET_PAGINATE}>
      <div>
        <CompanyTable
          meta={meta}
          companies={companies ? companies : []}
          reload={reload}
          setReload={setReload}
          loading={loading}
          setCompanies={setCompanies}
          current={current}
        />
      </div>
    </Access>
  );
};

export default Companies;
