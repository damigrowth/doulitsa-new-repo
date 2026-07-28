import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';

const IconTimes = ({ className = '', ...props }) => {
  return <FontAwesomeIcon icon={faTimes} className={className} {...props} />;
};

export default IconTimes;
