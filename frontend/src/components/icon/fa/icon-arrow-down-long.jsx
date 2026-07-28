import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowDownLong } from '@fortawesome/free-solid-svg-icons';

const IconArrowDownLong = ({ className = '', ...props }) => {
  return (
    <FontAwesomeIcon icon={faArrowDownLong} className={className} {...props} />
  );
};

export default IconArrowDownLong;
