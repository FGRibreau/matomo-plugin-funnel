<?php

namespace Piwik\Plugins\FunnelInsights\Commands;

use Piwik\Plugin\ConsoleCommand;
use Piwik\Plugins\FunnelInsights\API;
use Piwik\Archive\ArchiveInvalidator;
use Piwik\Container\StaticContainer;
use Piwik\Date;

class ArchiveFunnel extends ConsoleCommand
{
    protected function configure(): void
    {
        $this->setName('funnels:rearchive');
        $this->setDescription('Invalidates reports for a specific funnel to trigger re-archiving.');
    }

    protected function configureDefinition(): void
    {
        $this->addOptionalValueOption(
            'idsite',
            null,
            'ID Site'
        );
        $this->addOptionalValueOption(
            'idfunnel',
            null,
            'ID Funnel'
        );
    }

    protected function doExecute(): int
    {
        $input = $this->getInput();
        $output = $this->getOutput();

        $idSite = $input->getOption('idsite');
        $idFunnel = $input->getOption('idfunnel');

        if (!$idSite || !$idFunnel) {
            $output->writeln('<error>--idsite and --idfunnel are required.</error>');
            return self::FAILURE;
        }

        try {
            $funnel = API::getInstance()->getFunnel($idSite, $idFunnel);
            if (!$funnel) {
                $output->writeln("<error>Funnel ID $idFunnel not found for Site $idSite.</error>");
                return self::FAILURE;
            }
        } catch (\Exception $e) {
             $output->writeln("<error>" . $e->getMessage() . "</error>");
             return self::FAILURE;
        }

        $output->writeln("Invalidating reports for Funnel '$funnel[name]' (ID: $idFunnel)...");

        $invalidator = StaticContainer::get(ArchiveInvalidator::class);
        $invalidator->rememberToInvalidateArchivedReportsLater($idSite, Date::today());

        $output->writeln("<info>Success. Reports for Site $idSite invalidated for today. Run core:archive to process.</info>");

        return self::SUCCESS;
    }
}
