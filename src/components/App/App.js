import React from 'react';
import R from 'ramda';
import debounce from 'lodash.debounce';
import ankifyWordData from '../../core/ankifyWordData/ankifyWordData';
import wordToData from '../../core/wordToData/wordToData';
import splitByWord from '../../utils/splitByWord/splitByWord';
import maybePluralize from '../../utils/maybePluralize/maybePluralize';

import Header from '../Header/Header';
import ImportOptions from '../ImportOptions/ImportOptions';
import DownloadButton from '../DownloadButton/DownloadButton';
import ResultCards from '../ResultCards/ResultCards';
import UserWords from '../UserWords/UserWords';

import './App.css';

const sanitizeForFilename = R.pipe(
	R.replace(/ /g, ''),
	R.replace(/,/g, '_')
);

export default class App extends React.Component {
	state = {
		inputValue: '',
		cardsArr: [],
		showImportOptions: false
	}

	handleInputChange = async (event) => {
		const inputValue = event.target.value;

		this.setState({
			inputValue
		})

		this.debouncedComposeCards();
	}

	debouncedComposeCards = debounce(
		async () => {
			const words = splitByWord(this.state.inputValue);

			let cardsArr = [];
			let i = 0;

			for (let word of words) {
				const wordData = await wordToData(word);
				const wordCards = ankifyWordData(wordData)
				cardsArr[i] = wordCards;

				this.setState({
					cardsArr
				});

				i++;
			}
		}, 500
	)

	handleDownload = () => {
		this.setState({
			showImportOptions: true
		})
	}

	render() {
		const wordsTotalNumber = R.pipe(
			R.reject(R.isEmpty),
			R.length
		)(this.state.cardsArr);

		const cards = R.pipe(
			R.reject(R.isEmpty),
			R.join('\n')
		)(this.state.cardsArr);
		
		const cardsTotalNumber = R.match(/\n/g)(cards).length;

		const wordsTotal = maybePluralize(wordsTotalNumber, 'word');
		const cardsTotal = maybePluralize(cardsTotalNumber, 'card');

		const totals = `${wordsTotal}, ${cardsTotal}`;

		const date = new Date().toISOString().slice(0, 10);

		return (
			<div className='App'>
				<Header />

				<UserWords
					value={this.state.inputValue}
					onChange={this.handleInputChange}
				/>

				<ResultCards
					value={cards}
				/>

				<div  className='App__download-section'>
					<span className='App__total'>
						{totals}
					</span>
					<DownloadButton
						fileContent={encodeURIComponent(cards)}
						fileName={`longman-to-anki_${date}_${sanitizeForFilename(totals)}`}
						onClick={this.handleDownload}
						disabled={!cards}
					/>
				</div>

				{this.state.showImportOptions && <ImportOptions />}
			</div>
		);
	}
}
