"use client";
import React, { useEffect, useState } from "react";
import { IJob } from "@/types/backend";
import { fetchJobs } from "@/config/api";
import Access from "@/components/admin/Access/Access";
import { ALL_PERMISSIONS } from "@/config/permissions";

import JobTable from "@/components/admin/Jobs/Job.table";
import { useSearchParams } from "next/navigation";
import { useAppSelector } from "@/lib/redux/hooks";

const Jobs = (props: any) => {
  const param = useSearchParams();
  const current = (param.get("page") as unknown as number) || 1;
  const [jobs, setJobs] = useState<IJob[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [meta, setMeta] = useState<any>(null);
  const [reload, setReload] = useState(false);
  const user = useAppSelector((state: any) => state.auth.user);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const role = user?.role?.name;
      console.log("role", role);
      const res = await fetchJobs({
        current: current,
        email: role === "HR" ? user.email : undefined,
      });
      setJobs(res?.data?.result || []);
      setMeta(res?.data?.meta);
      setLoading(false);
    };

    fetchData();
  }, [current, reload]);

  return (
    <Access permission={ALL_PERMISSIONS.JOBS.GET_PAGINATE}>
      <div>
        <JobTable
          meta={meta}
          jobs={jobs ? jobs : []}
          reload={reload}
          setReload={setReload}
          loading={loading}
          setJobs={setJobs}
          current={current}
        />
      </div>
    </Access>
  );
};

export default Jobs;
