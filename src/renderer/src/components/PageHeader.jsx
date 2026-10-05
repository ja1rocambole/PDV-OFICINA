import { Flex, Typography } from 'antd'
import PropTypes from 'prop-types'

export default function PageHeader({ title, extra }) {
  return (
    <Flex justify="space-between" align="center" style={{ marginBottom: 16 }}>
      <Typography.Title level={4} style={{ margin: 0 }}>
        {title}
      </Typography.Title>
      {extra}
    </Flex>
  )
}

PageHeader.propTypes = { title: PropTypes.node.isRequired, extra: PropTypes.node }
