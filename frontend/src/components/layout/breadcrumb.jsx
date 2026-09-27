import React from 'react'
import { FiChevronRight } from 'react-icons/fi'
import './breadcrumb.css'

const Breadcrumb = ({ items }) => {
  return (
    <div className="w-full mx-0 my-2 px-4 py-2 flex items-center rounded-md text-sm font-medium text-gray-600 breadcrumb-shadow bg-white">
      <div className="w-full flex items-center ">
        {items.slice(0, -1).map((item, index) => (
          <React.Fragment key={index}>
            <span className="cursor-pointer transition-all duration-150">
              {item}
            </span>
            <FiChevronRight className="mx-2 text-gray-400" />
          </React.Fragment>
        ))}
        <span className="text-gray-500">{items[items.length - 1]}</span>
      </div>
    </div>
  )
}

export default Breadcrumb;
