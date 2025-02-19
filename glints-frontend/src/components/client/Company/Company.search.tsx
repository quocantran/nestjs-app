"use client";

import React from "react";

import classNames from "classnames/bind";
import styles from "../../../styles/CompanyClient.module.scss";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch } from "@fortawesome/free-solid-svg-icons";

const cx = classNames.bind(styles);

interface IProps {
  handleChange: (e: any) => void;
  handleKeyDown: (e: any) => void;
}

const SearchComponent = (props: IProps) => {
  const { handleChange, handleKeyDown } = props;
  return (
    <div className={cx("search-wrapper")}>
      <div className={cx("search-inner")}>
        <FontAwesomeIcon icon={faSearch} />
        <div className={cx("search-input")}>
          <input
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            type="text"
            placeholder="Nhập từ khóa"
          />
        </div>
      </div>
    </div>
  );
};

export default SearchComponent;
