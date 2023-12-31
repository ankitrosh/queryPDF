// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import { PineconeClient } from "@pinecone-database/pinecone";
const PDFServicesSdk = require('@adobe/pdfservices-node-sdk');
const fs = require('fs');
const AdmZip = require('adm-zip');

type Data = {
  text: string
}

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
    const OUTPUT_ZIP = './ExtractTextInfoFromPDF.zip';

    //Remove if the output already exists.
    if(fs.existsSync(OUTPUT_ZIP)) fs.unlinkSync(OUTPUT_ZIP);

    const INPUT_PDF = './public/file.pdf';
    const credentials =  PDFServicesSdk.Credentials
        .servicePrincipalCredentialsBuilder()
        .withClientId(process.env.ADOBE_CLIENT_ID)
        .withClientSecret(process.env.ADOBE_CLIENT_SECRET)
        .build();
    const clientConfig = PDFServicesSdk.ClientConfig
        .clientConfigBuilder()
        .withConnectTimeout(6000000)
        .build();
    const executionContext = PDFServicesSdk.ExecutionContext.create(credentials, clientConfig);
    
    // Create a new operation instance.
    const extractPDFOperation = PDFServicesSdk.ExtractPDF.Operation.createNew(),
    input = PDFServicesSdk.FileRef.createFromLocalFile(
        INPUT_PDF, 
        PDFServicesSdk.ExtractPDF.SupportedSourceFormat.pdf
    );

    // Build extractPDF options
    const options = new PDFServicesSdk.ExtractPDF.options.ExtractPdfOptions.Builder()
        .addElementsToExtract(PDFServicesSdk.ExtractPDF.options.ExtractElementType.TEXT).build()

    extractPDFOperation.setInput(input);
    extractPDFOperation.setOptions(options);
        console.log('starting extraction')
    extractPDFOperation.execute(executionContext)
    .then((result: any) => result.saveAsFile(OUTPUT_ZIP))
    .then(() => {
        console.log('Successfully extracted information from PDF.');
        let zip = new AdmZip(OUTPUT_ZIP);
        let jsondata = zip.readAsText('structuredData.json');
        let data = JSON.parse(jsondata);
        let text = ""
        data.elements.forEach((element: { Path: string; Text: any; }) => {
            if(element.Path.endsWith('/H1')) {
                console.log(element.Text);
            }
            text += element.Text ?? " ";
        });
        fs.writeFileSync("outputadobe.txt", text)
        res.status(200).json({ text: text })
    })
    .catch((err:any) => res.status(200).json({ text: "text" }));
    

    
    
}
