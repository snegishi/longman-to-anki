import React from 'react'
import { saveAs } from 'file-saver'

import normalizeWordData from '../../core/normalizeWordData/normalizeWordData'
import makeCard from '../../core/makeCard/makeCard'

import splitByWord from '../../utils/splitByWord/splitByWord'
import maybePluralize from '../../utils/maybePluralize/maybePluralize'
import wordToData from '../../utils/wordToData/wordToData'

import GithubCorner from 'react-github-corner'

import Header from '../Header/Header'
import DownloadButton from '../DownloadButton/DownloadButton'
import ResultCards from '../ResultCards/ResultCards'
import UserWords from '../UserWords/UserWords'
import DeckName from '../DeckName/DeckName'

import Grid from '@material-ui/core/Grid'

import './App.css'

const template = {
    css: `
			.card { font-family: arial; font-size: 20px; text-align: center; color: black; background-color: white; }
			.lta-example { font-style: italic; } 
			.lta-form { font-weight: bold; }
		`
}

export default class App extends React.Component {
    state = {
        words: [],
        inputValue: '',
        wordsCards: {},
        deckName: 'English words',
        isDeckBeingDownloaded: false
    }

    componentDidMount() {
        try {
            if (localStorage.state) {
                this.setState(JSON.parse(localStorage.state))
            } else {
                this.setState({ inputValue: localStorage.inputValue })
            }
        } catch (error) {
            console.error(error)
        }
    }

    componentDidUpdate(prevProps, prevState) {
        localStorage.state = JSON.stringify(this.state)
    }

    handleDeckNameChange = event => {
        this.setState({
            deckName: event.target.value
        })
    }

    handleInputChange = async event => {
        this.setState({
            inputValue: event.target.value
        })
    }

    handleDeleteButtonClick = wordToDelete => () => {
        this.setState(prevState => ({
            words: prevState.words.filter(word => word !== wordToDelete),
            wordsCards: { ...prevState.wordsCards, [wordToDelete]: undefined }
        }))
    }

    handleSubmit = event => {
        event.preventDefault()

        if (this.state.inputValue === '') {
            return
        }

        const isMultilineInputValue = /\n/.test(this.state.inputValue)
        const newWords = isMultilineInputValue
            ? splitByWord(this.state.inputValue)
            : [this.state.inputValue]

        this.setState(
            prevState => ({
                words: [...newWords, ...prevState.words],
                inputValue: ''
            }),
            () => {
                this.state.words.map(async word => {
                    const wordData = await wordToData(word)

                    if (wordData.status === 'offline') {
                        this.setState(prevState => ({
                            wordsCards: {
                                ...prevState.wordsCards,
                                [word]: 'offline'
                            }
                        }))
                        return
                    }

                    if (wordData.status === 'word not found') {
                        this.setState(prevState => ({
                            wordsCards: {
                                ...prevState.wordsCards,
                                [word]: 'word not found'
                            }
                        }))
                        return
                    }

                    this.setState(prevState => ({
                        wordsCards: {
                            ...prevState.wordsCards,
                            [wordData.payload.headword]: normalizeWordData(
                                wordData.payload
                            )
                        },
                        words: prevState.words.map(item =>
                            item === word ? wordData.payload.headword : item
                        )
                    }))
                })
            }
        )
    }

    handleDownload = event => {
        event.preventDefault()

        const cardsArr = this.state.words
            .reverse()
            .map(word => this.state.wordsCards[word])
            .reduce((acc, curr) => (curr ? acc.concat(...curr) : acc), [])
            .map(makeCard)

        this.setState(
            {
                isDeckBeingDownloaded: true
            },
            () => {
                fetch('https://micro-anki-yakhinvadim.now.sh/', {
                    method: 'POST',
                    headers: new Headers({
                        'Content-Type': 'application/json'
                    }),
                    body: JSON.stringify({
                        cards: cardsArr,
                        deckName: this.state.deckName,
                        template: template
                    })
                })
                    .then(res => res.blob())
                    .then(blob => saveAs(blob, `${this.state.deckName}.apkg`))
                    .then(() => {
                        this.setState({
                            isDeckBeingDownloaded: false
                        })
                    })
                    .catch(console.error)
            }
        )
    }

    handleEnterPress = event => {
        if (event.key === 'Enter' && event.shiftKey === false) {
            event.preventDefault()
            this.handleSubmit(event)
        }
    }

    render() {
        const wordsTotalNumber = this.state.words.length
        const cardsTotalNumber = Object.values(this.state.wordsCards).reduce(
            (acc, curr) => {
                return acc + (curr ? curr.length : 0)
            },
            0
        )

        const wordsTotal = maybePluralize(wordsTotalNumber, 'word')
        const cardsTotal = maybePluralize(cardsTotalNumber, 'card')

        const totals = `${wordsTotal}, ${cardsTotal}`

        return (
            <div className="App">
                <GithubCorner
                    href="https://github.com/yakhinvadim/longman-to-anki"
                    bannerColor="#3f51b5"
                />

                <Grid container spacing={16}>
                    <Grid item xs={12}>
                        <Header />
                    </Grid>

                    <Grid item xs={12}>
                        <form onSubmit={this.handleSubmit}>
                            <UserWords
                                value={this.state.inputValue}
                                onChange={this.handleInputChange}
                                onKeyDown={this.handleEnterPress}
                            />
                        </form>
                    </Grid>

                    <Grid item xs={12}>
                        <ResultCards
                            words={this.state.words}
                            wordsCards={this.state.wordsCards}
                            onDeleteButtonClick={this.handleDeleteButtonClick}
                        />
                    </Grid>

                    <Grid item xs={12}>
                        <DeckName
                            value={this.state.deckName}
                            onChange={this.handleDeckNameChange}
                        />
                    </Grid>

                    <Grid item xs={12}>
                        <div className="App__download-section">
                            <span className="App__total">{totals}</span>
                            <DownloadButton
                                onClick={this.handleDownload}
                                disabled={!cardsTotalNumber}
                                isLoading={this.state.isDeckBeingDownloaded}
                            />
                        </div>
                    </Grid>
                </Grid>
            </div>
        )
    }
}
