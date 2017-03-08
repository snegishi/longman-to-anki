import cheerify from '../../helpers/cheerify';

export default function getHeadword(pageMarkup) {
  const $ = cheerify(pageMarkup);

  return $('h1.pagetitle').text().trim();
}
