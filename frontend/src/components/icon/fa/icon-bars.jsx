import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars } from '@fortawesome/free-solid-svg-icons';

const IconBars = ({ className = '', ...props }) => {
  return <FontAwesomeIcon icon={faBars} className={className} {...props} />;
};

export default IconBars;
