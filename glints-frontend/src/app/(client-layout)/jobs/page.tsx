"use client";
import React, {
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import styles from "../../../styles/JobClient.module.scss";
import "../../../styles/SearchComponent.scss";
import classNames from "classnames/bind";
import { fetchJobById, fetchJobs, searchJobsWithElastic } from "@/config/api";
import { IJob, IMeta } from "@/types/backend";
import {
  Button,
  Card,
  Checkbox,
  Col,
  Flex,
  Form,
  Radio,
  Result,
  Row,
  Select,
  Skeleton,
  Spin,
  Tag,
  message,
} from "antd";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faClock,
  faClose,
  faLocation,
  faLocationArrow,
} from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import vi_VN from "dayjs/locale/vi";
import ResumeModalClient from "@/components/client/Resume/ResumeClient.modal";
import { useAppSelector } from "@/lib/redux/hooks";
import { useRouter, useSearchParams } from "next/navigation";
import { formatNumberToMillions } from "@/helpers/index";
import { isMobile } from "react-device-detect";
import { LoadingOutlined } from "@ant-design/icons";
import { debounce } from "lodash";
import { Option } from "antd/es/mentions";
import Column from "antd/es/table/Column";
import {
  experienceOptions,
  LIST_LOCATION,
  SalaryOptions,
  sortOption,
} from "@/config/utils";
import SearchComponent from "@/components/client/Company/Company.search";
dayjs.extend(relativeTime);
dayjs.locale(vi_VN);

const cx = classNames.bind(styles);

const PAGE = 1;

const PAGE_SIZE = 10;

const JobClient = (props: any) => {
  const params = useSearchParams();
  const [jobs, setJobs] = useState<IJob[]>([]);
  const [current, setCurrent] = useState<number>(PAGE);
  const [name, setName] = useState<string | undefined>(
    params.get("name") || undefined
  );
  const [inputName, setInputName] = useState<string>("");
  const [location, setLocation] = useState<string | undefined>(
    params.get("location") || "Tất cả thành phố"
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [sort, setSort] = useState<string>("createdAt");
  const [jobSelect, setJobSelect] = useState<IJob | null>(null);
  const [openModal, setOpenModal] = useState<boolean>(false);
  const [meta, setMeta] = useState({} as any);
  const [shouldRender, setShouldRender] = useState<boolean>(false);
  const [isOpenDescription, setIsOpenDescription] = useState<boolean>(false);
  const [salary, setSalary] = useState("Tất cả");
  const [experience, setExperience] = useState("Tất cả");
  const [isScrollToBottom, setIsScrollToBottom] = useState<boolean>(false);
  const [isLoadingDescription, setIsLoadingDescription] =
    useState<boolean>(false);
  const divRef = useRef<HTMLDivElement>(null);
  const navigate = useRouter();
  const isAuth = useAppSelector((state) => state.auth.isAuthenticated);
  const firstRender = useRef(true);
  const sortChanged = useRef(false);

  const handleClick = () => {
    if (!isAuth) {
      message.error("Vui lòng đăng nhập để ứng tuyển công việc!");
      return;
    }
    setOpenModal(true);
  };

  const handleClickCard = async (job: IJob) => {
    setIsOpenDescription(true);
    setIsLoadingDescription(true);
    const res = await fetchJobById(job._id as string);
    if (res?.data) {
      setJobSelect(res.data);
    }
    setIsLoadingDescription(false);
  };

  const handleChange = async (e: any) => {
    setInputName(e.target.value);
  };

  const handleKeyDown = (e: any) => {
    if (e.key === "Enter") {
      setCurrent(1);
      setName(inputName);
    }
  };

  useEffect(() => {
    if (sortChanged.current) {
      sortChanged.current = false;
    }

    if (current > meta?.pages && meta?.pages != 0) {
      setIsFetching(false);
      return;
    }
    const fetchData = async (page: number) => {
      if (current == 1) setLoading(true);

      const res = await searchJobsWithElastic({
        index: "jobs",
        from: (current - 1) * PAGE_SIZE,
        name: name ?? "",
        location: location === "Tất cả thành phố" ? "" : location,
        sort: sort,
        level: experience === "Tất cả" ? "" : experience,
        salary: salary === "Tất cả" ? "" : salary,
        size: PAGE_SIZE,
      });

      const temp = {
        current: current,
        pageSize: PAGE_SIZE,
        pages: Math.ceil((res?.data?.total.value as number) / PAGE_SIZE),
        total: res?.data.total.value as number,
      } as IMeta;
      setShouldRender(true);
      setMeta(temp);
      if (res?.data?.hits) {
        if (isScrollToBottom) {
          setJobs((prev) => [
            ...prev,
            ...(res?.data?.hits.map((job) => {
              return {
                _id: job._id,
                ...job._source,
              };
            }) as IJob[]),
          ]);
          setIsScrollToBottom(false);
        } else {
          setJobs(
            res?.data?.hits.map((job) => {
              return {
                _id: job._id,
                ...job._source,
              };
            }) as IJob[]
          );
        }

        setLoading(false);
      }
    };

    fetchData(current);
  }, [current, name, location, sort, salary, experience]);
  const handleScroll = useCallback(
    debounce((e: any) => {
      if (current >= meta?.pages) {
        if (isFetching) {
          setIsFetching(false);
        }
        return;
      }
      const { scrollTop, scrollHeight, clientHeight } = e.target;
      if (scrollTop + clientHeight >= scrollHeight) {
        setIsFetching(true);
        setCurrent((prevCurrent) => prevCurrent + 1);
        setIsScrollToBottom(true);
      }
    }, 300),
    [current, meta, isFetching]
  );

  useEffect(() => {
    setJobSelect(jobs[0]);
  }, [jobs]);

  useEffect(() => {
    const div = divRef.current;
    if (div) {
      div.addEventListener("scroll", handleScroll);
    }
    return () => {
      if (div) {
        div.removeEventListener("scroll", handleScroll);
      }
    };
  });

  return !shouldRender ? (
    <></>
  ) : (
    <div className={cx("wrapper")}>
      <div className={cx("container")}>
        <div className={cx("job-heading")}>
          <h1 style={{ textAlign: "center" }}>Gợi ý công việc dành cho bạn</h1>
          {!isOpenDescription && (
            <SearchComponent
              handleChange={handleChange}
              handleKeyDown={handleKeyDown}
            />
          )}
        </div>
        <div className={cx("job-content")}>
          <div className={cx("job-list")}>
            {!isOpenDescription && (
              <div className={cx("job-filter")}>
                <div className={cx("job-select")}>
                  <h4 style={{ fontSize: "20px", fontWeight: "400" }}>
                    Sắp xếp theo
                  </h4>

                  <Radio.Group
                    style={{ width: "100%" }}
                    value={sort}
                    onChange={(e) => {
                      setSort(e.target.value);

                      setCurrent(1);
                    }}
                  >
                    {sortOption.map((option) => (
                      <Col
                        style={{ marginBottom: "5px", width: "100%" }}
                        span={8}
                        key={option.value}
                      >
                        <Radio
                          style={{
                            fontSize: "15px",
                            width: "100%",
                            marginBottom: "5px",
                          }}
                          value={option.value}
                        >
                          {option.label}
                        </Radio>
                      </Col>
                    ))}
                  </Radio.Group>
                </div>
                <Form layout="vertical">
                  <Row gutter={[16, 16]}>
                    <Col span={24}>
                      <Form.Item
                        label={
                          <span
                            style={{ fontSize: "20px", marginBottom: "10px" }}
                          >
                            Địa Điểm
                          </span>
                        }
                      >
                        <Radio.Group
                          onChange={(e) => {
                            setLocation(e.target.value);
                            setCurrent(1);
                          }}
                          value={location}
                          style={{ width: "100%" }}
                        >
                          {LIST_LOCATION.map((option) => (
                            <Col key={option.value} span={8}>
                              <Radio
                                style={{
                                  fontSize: "15px",
                                  width: "100%",
                                  marginBottom: "5px",
                                }}
                                value={option.value}
                              >
                                {option.label}
                              </Radio>
                            </Col>
                          ))}
                        </Radio.Group>
                      </Form.Item>
                    </Col>
                    <Col span={24}>
                      <Form.Item
                        label={
                          <span
                            style={{ fontSize: "20px", marginBottom: "10px" }}
                          >
                            Mức Lương
                          </span>
                        }
                      >
                        <Radio.Group
                          onChange={(e) => {
                            setSalary(e.target.value);
                            setCurrent(1);
                          }}
                          value={salary}
                        >
                          <Row>
                            {SalaryOptions.map((option) => (
                              <Col
                                key={option.value}
                                style={{ marginBottom: "5px" }}
                                span={12}
                              >
                                <Radio value={option.value}>
                                  {option.label}
                                </Radio>
                              </Col>
                            ))}
                          </Row>
                        </Radio.Group>
                      </Form.Item>
                    </Col>
                    <Col span={24}>
                      <Form.Item
                        label={
                          <span
                            style={{ fontSize: "20px", marginBottom: "10px" }}
                          >
                            Kinh Nghiệm
                          </span>
                        }
                      >
                        <Radio.Group
                          onChange={(e) => {
                            setExperience(e.target.value);
                            setCurrent(1);
                          }}
                          value={experience}
                          style={{ width: "100%" }}
                        >
                          {experienceOptions.map((option: any) => (
                            <Col key={option.value} span={8}>
                              <Radio
                                style={{
                                  fontSize: "15px",
                                  width: "100%",
                                  marginBottom: "5px",
                                }}
                                value={option.value}
                              >
                                {option.label}
                              </Radio>
                            </Col>
                          ))}
                        </Radio.Group>
                      </Form.Item>
                    </Col>
                  </Row>
                </Form>
              </div>
            )}
            {!jobs.length ? (
              <Result
                style={{ flex: 0.6 }}
                status="404"
                title="Không tìm thấy công việc"
                subTitle="Không tìm thấy công việc phù hợp với yêu cầu của bạn. Vui lòng thử lại với từ khóa khác!"
              />
            ) : loading ? (
              <div style={{ flex: 0.6 }}>
                <Skeleton
                  paragraph={{
                    rows: 4,
                  }}
                  style={{ margin: "20px 0" }}
                  active
                  avatar
                />
                <Skeleton
                  paragraph={{
                    rows: 4,
                  }}
                  style={{ margin: "20px 0" }}
                  active
                  avatar
                />
                <Skeleton
                  paragraph={{
                    rows: 4,
                  }}
                  style={{ margin: "20px 0" }}
                  active
                  avatar
                />
                <Skeleton
                  paragraph={{
                    rows: 4,
                  }}
                  style={{ margin: "20px 0" }}
                  active
                  avatar
                />
              </div>
            ) : (
              <div
                style={{
                  maxWidth: isOpenDescription ? "calc(100% - 400px)" : "auto",
                  height: isOpenDescription ? "108vh" : "76vh",
                }}
                className={cx("job-item")}
                ref={divRef}
              >
                {jobs?.map((job) => {
                  return (
                    <Card
                      bordered
                      hoverable
                      key={job._id}
                      style={{
                        marginTop: "15px",
                        cursor: "pointer",
                        backgroundColor:
                          job._id === jobSelect?._id ? "#e6f4ff" : "",
                      }}
                      onClick={() => {
                        if (isMobile) {
                          navigate.push(`/jobs/${job._id}`);
                          return;
                        }
                        handleClickCard(job);
                      }}
                      title={job.name}
                      loading={loading}
                    >
                      {job.skills.map((skill, idx) => {
                        return (
                          <Tag key={idx} color="blue">
                            {skill}
                          </Tag>
                        );
                      })}
                      <div className={cx("item-content")}>
                        <img src={job.company?.logo} alt="logo" />
                        <div className={cx("company-info")}>
                          <Link href={`/companies/${job.company?._id}`}>
                            {job.company?.name}
                          </Link>
                          <p>
                            <FontAwesomeIcon icon={faLocationArrow} />
                            {job.location}
                          </p>
                        </div>
                      </div>
                      <div className={cx("job-time")}>
                        <Tag color="rgb(100, 100, 100)">
                          <FontAwesomeIcon icon={faClock} />
                          {dayjs(job.updatedAt).fromNow()}
                        </Tag>
                      </div>
                    </Card>
                  );
                })}
                {isFetching && (
                  <Flex
                    align="center"
                    justify="center"
                    style={{ marginTop: "15px" }}
                  >
                    <Spin
                      indicator={
                        <LoadingOutlined style={{ fontSize: 48 }} spin />
                      }
                    />
                  </Flex>
                )}
              </div>
            )}

            {isOpenDescription && (
              <div className={cx("job-description")}>
                {isLoadingDescription ? (
                  <>
                    <Skeleton
                      style={{ margin: "20px 0" }}
                      active
                      avatar
                      paragraph={{
                        rows: 4,
                      }}
                    />
                    <Skeleton
                      style={{ margin: "20px 0" }}
                      active
                      paragraph={{
                        rows: 4,
                      }}
                    />
                    <Skeleton
                      style={{ margin: "20px 0" }}
                      active
                      paragraph={{
                        rows: 4,
                      }}
                    />
                    <Skeleton
                      style={{ margin: "20px 0" }}
                      active
                      paragraph={{
                        rows: 4,
                      }}
                    />
                  </>
                ) : (
                  <>
                    <div className={cx("header")}>
                      <div className={cx("header-info")}>
                        <img src={jobSelect?.company?.logo} alt="logo" />

                        <div className={cx("company")}>
                          <h3
                            onClick={() => {
                              navigate.push(`/jobs/${jobSelect?._id}`);
                            }}
                          >
                            {jobSelect?.name}
                          </h3>

                          <Link href={`/companies/${jobSelect?.company?._id}`}>
                            {jobSelect?.company?.name}
                          </Link>
                        </div>
                      </div>
                      <button
                        onClick={handleClick}
                        className={cx("submit-job")}
                      >
                        Ứng tuyển nhanh
                      </button>
                      <div
                        className={cx("close")}
                        onClick={() => setIsOpenDescription(false)}
                      >
                        <FontAwesomeIcon icon={faClose} />
                      </div>
                    </div>

                    <div className={cx("job-info")}>
                      <Tag color="rgb(100, 100, 100)">
                        <FontAwesomeIcon icon={faClock} /> Đăng{" "}
                        {dayjs(jobSelect?.createdAt).fromNow()}
                      </Tag>
                      <Tag color="green">
                        <FontAwesomeIcon icon={faClock} /> Cập nhật{" "}
                        {dayjs(jobSelect?.updatedAt).fromNow()}
                      </Tag>

                      <h3 className={cx("job-title")}>Thông tin công việc</h3>
                      <Tag color="green">
                        {"₫" +
                          formatNumberToMillions(
                            jobSelect?.salary as number
                          )}{" "}
                        triệu
                      </Tag>
                      <Tag color="blue">{`Trình độ ${jobSelect?.level}`}</Tag>
                      <Tag color="rgb(100, 100, 100)">
                        {jobSelect?.location}
                      </Tag>
                      <h3>Số lượng tuyển</h3>
                      <Tag color="blue">{`${jobSelect?.quantity} người`}</Tag>

                      <h3>Skills</h3>
                      {jobSelect?.skills.map((skill, idx) => {
                        return (
                          <Tag key={skill} color="blue" bordered>
                            {skill}
                          </Tag>
                        );
                      })}
                      <h3>{`Chi tiết công việc ${jobSelect?.name} tại ${jobSelect?.company?.name}`}</h3>
                      <div
                        className={cx("job-detail")}
                        dangerouslySetInnerHTML={{
                          __html: jobSelect?.description as string,
                        }}
                      />
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        <ResumeModalClient
          openModal={openModal}
          setOpenModal={setOpenModal}
          dataInit={jobSelect}
        />
      </div>
    </div>
  );
};

const JobClientWithSuspense = (props: any) => (
  <Suspense
    fallback={
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "15px 0",
        }}
      >
        <Flex align="center" gap="middle">
          <Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} />
        </Flex>
      </div>
    }
  >
    <JobClient {...props} />
  </Suspense>
);

export default JobClientWithSuspense;
