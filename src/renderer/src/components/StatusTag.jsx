import { Tag } from 'antd'
import PropTypes from 'prop-types'
import { STATUS_OS } from '../utils/status'

export default function StatusTag({ status }) {
  const s = STATUS_OS[status] || { label: status, color: 'default' }
  return <Tag color={s.color}>{s.label}</Tag>
}

StatusTag.propTypes = { status: PropTypes.string }
